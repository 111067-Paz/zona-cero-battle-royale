import { computed, Injectable, signal } from '@angular/core';
import {
  Bienvenida,
  ConfigBienvenida,
  Evento,
  JugadorSnapshot,
  ProyectilSnapshot,
  Snapshot,
} from '../../models/protocolo';
import {
  EstadoVisual,
  JugadorVisual,
  LineaKill,
  NumeroDanio,
  ProyectilVisual,
  ResultadoPartida,
} from './estado-visual';

interface SnapshotFechado {
  recibidoEn: number;
  snapshot: Snapshot;
}

/**
 * Buffer de snapshots + interpolacion (PLAN §7-C). Recibe el stream del servidor, mantiene los ultimos
 * {@link BUFFER_MAX} y produce el estado visual pidiendo render ~100 ms EN EL PASADO.
 *
 * <p>Fase 2: ademas interpola PROYECTILES por su idRed (los nuevos aparecen sin lerp; los conocidos se
 * interpolan linealmente, sin el snap por distancia de los jugadores, porque viajan lejos por
 * snapshot); computa NUMEROS DE DANIO por diff de HP entre snapshots (R29); y arma el KILL FEED desde
 * los EVENTO KILL. Todo lo del HUD se actualiza por snapshot/evento (signals), jamas por frame.
 */
@Injectable({ providedIn: 'root' })
export class EstadoPartidaStore {
  private static readonly BUFFER_MAX = 30;
  private static readonly RETRASO_INTERP_MS = 100;
  private static readonly DISTANCIA_SNAP = 3;
  private static readonly EDAD_MAXIMA_MS = 1000;
  private static readonly DURACION_DANIO_MS = 600;
  private static readonly MAX_KILL_FEED = 5;

  private buffer: SnapshotFechado[] = [];
  private ultimoTick = -1;
  private numerosDanio: NumeroDanio[] = [];

  readonly config = signal<ConfigBienvenida | null>(null);
  readonly idJugador = signal<string | null>(null);
  readonly idPartida = signal<string | null>(null);
  readonly idMapa = signal<string | null>(null);

  /** Ultimo snapshot recibido, para los signals del HUD (HP, arma, kills, estado). */
  readonly ultimoSnapshot = signal<Snapshot | null>(null);

  /** Kill feed (mas reciente primero, tope MAX_KILL_FEED). Se actualiza por EVENTO, no por frame. */
  readonly killFeed = signal<LineaKill[]>([]);

  /** Podio, seteado UNA vez por el EVENTO FIN_PARTIDA (§7-F). */
  readonly resultadoFinal = signal<ResultadoPartida | null>(null);

  /** El jugador propio en el ultimo snapshot (HP, arma, kills del HUD). */
  readonly jugadorPropio = computed<JugadorSnapshot | null>(() => {
    const snapshot = this.ultimoSnapshot();
    const idPropio = this.idJugador();
    if (snapshot === null || idPropio === null) {
      return null;
    }
    return snapshot.jugadores.find((jugador) => jugador.id === idPropio) ?? null;
  });

  /** Cantidad de jugadores VIVOS, para el indicador ALIVE del HUD. */
  readonly vivos = computed<number>(() => {
    const snapshot = this.ultimoSnapshot();
    if (snapshot === null) {
      return 0;
    }
    return snapshot.jugadores.filter((jugador) => jugador.estadoVida === 'VIVO').length;
  });

  aplicarBienvenida(bienvenida: Bienvenida): void {
    this.config.set(bienvenida.config);
    this.idJugador.set(bienvenida.idJugador);
    this.idPartida.set(bienvenida.idPartida);
    this.idMapa.set(bienvenida.idMapa);
    this.reiniciar();
  }

  aplicarSnapshot(snapshot: Snapshot): void {
    if (snapshot.tick <= this.ultimoTick) {
      return; // viejo o duplicado
    }
    this.registrarDanios(this.ultimoSnapshot(), snapshot);
    this.ultimoTick = snapshot.tick;
    this.buffer.push({ recibidoEn: performance.now(), snapshot });
    if (this.buffer.length > EstadoPartidaStore.BUFFER_MAX) {
      this.buffer.shift();
    }
    this.ultimoSnapshot.set(snapshot);
  }

  aplicarEvento(evento: Evento): void {
    if (evento.evento === 'FIN_PARTIDA') {
      this.aplicarFinPartida(evento.datos);
      return;
    }
    if (evento.evento !== 'KILL') {
      return;
    }
    const linea: LineaKill = {
      asesino: evento.datos['asesino'] ?? '',
      victima: evento.datos['victima'] ?? '',
      arma: evento.datos['arma'] ?? '',
      creadoEn: performance.now(),
    };
    this.killFeed.update((actual) => [linea, ...actual].slice(0, EstadoPartidaStore.MAX_KILL_FEED));
  }

  private aplicarFinPartida(datos: Record<string, string>): void {
    const killsPorJugador: Record<string, number> = {};
    const prefijo = 'kills_';
    for (const [clave, valor] of Object.entries(datos)) {
      if (clave.startsWith(prefijo)) {
        killsPorJugador[clave.slice(prefijo.length)] = Number(valor);
      }
    }
    this.resultadoFinal.set({ ganador: datos['ganador'] ?? '', killsPorJugador });
  }

  reiniciar(): void {
    this.buffer = [];
    this.ultimoTick = -1;
    this.numerosDanio = [];
    this.ultimoSnapshot.set(null);
    this.killFeed.set([]);
    this.resultadoFinal.set(null);
  }

  estadoVisual(ahora: number): EstadoVisual | null {
    if (this.buffer.length === 0) {
      return null;
    }
    const masNuevo = this.buffer[this.buffer.length - 1];
    if (ahora - masNuevo.recibidoEn > EstadoPartidaStore.EDAD_MAXIMA_MS) {
      return this.sinInterpolar(masNuevo.snapshot);
    }
    const objetivo = ahora - EstadoPartidaStore.RETRASO_INTERP_MS;
    const par = this.parQueEncierra(objetivo);
    if (par === null) {
      return this.sinInterpolar(masNuevo.snapshot);
    }
    const [anterior, siguiente] = par;
    const rango = siguiente.recibidoEn - anterior.recibidoEn;
    const t = rango <= 0 ? 1 : this.acotar((objetivo - anterior.recibidoEn) / rango);
    return this.interpolar(anterior.snapshot, siguiente.snapshot, t);
  }

  private registrarDanios(previo: Snapshot | null, actual: Snapshot): void {
    if (previo === null) {
      return;
    }
    const ahora = performance.now();
    const hpPrevio = new Map<string, number>();
    for (const jugador of previo.jugadores) {
      hpPrevio.set(jugador.id, jugador.hp);
    }
    for (const jugador of actual.jugadores) {
      const anterior = hpPrevio.get(jugador.id);
      if (anterior !== undefined && jugador.hp < anterior) {
        this.numerosDanio.push({ x: jugador.x, y: jugador.y, cantidad: anterior - jugador.hp, creadoEn: ahora });
      }
    }
    this.numerosDanio = this.numerosDanio.filter(
      (numero) => ahora - numero.creadoEn < EstadoPartidaStore.DURACION_DANIO_MS,
    );
  }

  private parQueEncierra(objetivo: number): [SnapshotFechado, SnapshotFechado] | null {
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].recibidoEn <= objetivo && objetivo <= this.buffer[i + 1].recibidoEn) {
        return [this.buffer[i], this.buffer[i + 1]];
      }
    }
    return null;
  }

  private interpolar(anterior: Snapshot, siguiente: Snapshot, t: number): EstadoVisual {
    const previos = new Map<string, JugadorSnapshot>();
    for (const jugador of anterior.jugadores) {
      previos.set(jugador.id, jugador);
    }
    const jugadores: JugadorVisual[] = siguiente.jugadores.map((destino) =>
      this.interpolarJugador(previos.get(destino.id), destino, t),
    );
    return {
      tick: siguiente.tick,
      estado: siguiente.estado,
      jugadores,
      proyectiles: this.interpolarProyectiles(anterior.proyectiles, siguiente.proyectiles, t),
      numerosDanio: this.numerosDanio,
      zona: this.aZonaVisual(siguiente),
      botines: this.aBotinesVisual(siguiente),
    };
  }

  private interpolarProyectiles(
    anteriores: ProyectilSnapshot[],
    siguientes: ProyectilSnapshot[],
    t: number,
  ): ProyectilVisual[] {
    const previos = new Map<number, ProyectilSnapshot>();
    for (const proyectil of anteriores) {
      previos.set(proyectil.id, proyectil);
    }
    return siguientes.map((destino) => {
      const origen = previos.get(destino.id);
      if (origen === undefined) {
        return { id: destino.id, x: destino.x, y: destino.y, angulo: destino.angulo }; // nuevo -> snap
      }
      return {
        id: destino.id,
        x: this.lerp(origen.x, destino.x, t),
        y: this.lerp(origen.y, destino.y, t),
        angulo: destino.angulo,
      };
    });
  }

  private interpolarJugador(
    origen: JugadorSnapshot | undefined,
    destino: JugadorSnapshot,
    t: number,
  ): JugadorVisual {
    if (origen === undefined || this.distancia(origen, destino) > EstadoPartidaStore.DISTANCIA_SNAP) {
      return this.visualDe(destino);
    }
    return {
      id: destino.id,
      x: this.lerp(origen.x, destino.x, t),
      y: this.lerp(origen.y, destino.y, t),
      angulo: this.interpolarAngulo(origen.angulo, destino.angulo, t),
      hp: destino.hp,
      estadoVida: destino.estadoVida,
      conectado: destino.conectado,
    };
  }

  private sinInterpolar(snapshot: Snapshot): EstadoVisual {
    return {
      tick: snapshot.tick,
      estado: snapshot.estado,
      jugadores: snapshot.jugadores.map((jugador) => this.visualDe(jugador)),
      proyectiles: snapshot.proyectiles.map((proyectil) => ({
        id: proyectil.id,
        x: proyectil.x,
        y: proyectil.y,
        angulo: proyectil.angulo,
      })),
      numerosDanio: this.numerosDanio,
      zona: this.aZonaVisual(snapshot),
      botines: this.aBotinesVisual(snapshot),
    };
  }

  /** Zona y botin no se interpolan: cambian lento y el snapshot mas nuevo alcanza (sin jitter visible). */
  private aZonaVisual(snapshot: Snapshot): EstadoVisual['zona'] {
    if (snapshot.zona === null) {
      return null;
    }
    return {
      cx: snapshot.zona.cx,
      cy: snapshot.zona.cy,
      radio: snapshot.zona.radio,
      radioProximo: snapshot.zona.radioProximo,
    };
  }

  private aBotinesVisual(snapshot: Snapshot): EstadoVisual['botines'] {
    return snapshot.botines.map((botin) => ({ id: botin.id, tipo: botin.tipo, x: botin.x, y: botin.y }));
  }

  private visualDe(jugador: JugadorSnapshot): JugadorVisual {
    return {
      id: jugador.id,
      x: jugador.x,
      y: jugador.y,
      angulo: jugador.angulo,
      hp: jugador.hp,
      estadoVida: jugador.estadoVida,
      conectado: jugador.conectado,
    };
  }

  private distancia(a: JugadorSnapshot, b: JugadorSnapshot): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private interpolarAngulo(a: number, b: number, t: number): number {
    let delta = b - a;
    while (delta > Math.PI) {
      delta -= 2 * Math.PI;
    }
    while (delta < -Math.PI) {
      delta += 2 * Math.PI;
    }
    return a + delta * t;
  }

  private acotar(t: number): number {
    return Math.max(0, Math.min(1, t));
  }
}
