import { computed, Injectable, signal } from '@angular/core';
import { Mapa } from '../../models/mapa';
import {
  Bienvenida,
  ConfigBienvenida,
  Evento,
  Input,
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
import { Punto, simularPasoMovimiento } from './prediccion/resolutor-colisiones';

interface InputPendiente {
  sec: number;
  mover: Punto;
}

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
 *
 * <p>Fase 7: el jugador PROPIO deja de interpolarse ~100ms en el pasado como los demas — se predice
 * localmente en {@link #aplicarInputLocal} (misma resolucion de colisiones que el servidor, R-F7) y
 * se reconcilia contra la posicion autoritativa cada vez que llega su `ack` en el snapshot. Los
 * DEMAS jugadores siguen exactamente el camino de interpolacion de siempre, sin tocar.
 */
@Injectable({ providedIn: 'root' })
export class EstadoPartidaStore {
  private static readonly BUFFER_MAX = 30;
  private static readonly RETRASO_INTERP_MS = 100;
  private static readonly DISTANCIA_SNAP = 3;
  private static readonly EDAD_MAXIMA_MS = 1000;
  private static readonly DURACION_DANIO_MS = 600;
  private static readonly MAX_KILL_FEED = 5;
  /** Fraccion del error de reconciliacion que se "suelta" por frame — decae, nunca frena el input nuevo. */
  private static readonly DECAIMIENTO_CORRECCION = 0.3;
  /** Offset visual por debajo de esto se considera cero (evita temblor de punto flotante eterno). */
  private static readonly OFFSET_DESPRECIABLE = 0.001;
  /** Historial de RTT que se conserva para no dejar crecer el mapa sin limite. */
  private static readonly RTT_MAX_MUESTRAS = 64;

  private buffer: SnapshotFechado[] = [];
  private ultimoTick = -1;
  private numerosDanio: NumeroDanio[] = [];

  private mapa: Mapa | null = null;
  /** Posicion SIMULADA real (verdad para seguir prediciendo) — nunca se demora, nunca se suaviza. */
  private posicionPredicha: Punto | null = null;
  /** Error de la ULTIMA reconciliacion, que se va soltando de a poco en el render (sin goma). */
  private offsetVisual: Punto = { x: 0, y: 0 };
  private anguloPredicho = 0;
  private historialInputs: InputPendiente[] = [];
  private enviadoEnPorSec = new Map<number, number>();

  readonly config = signal<ConfigBienvenida | null>(null);
  readonly idJugador = signal<string | null>(null);
  readonly idPartida = signal<string | null>(null);
  readonly idMapa = signal<string | null>(null);

  /** RTT estimado desde el ultimo `ack` recibido (F7): sec enviada -> ack recibido, sin protocolo nuevo. */
  readonly rttMs = signal<number | null>(null);

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

  /** El mapa llega por REST despues de BIENVENIDA (Flujo B): sin el, no hay contra que predecir. */
  establecerMapa(mapa: Mapa): void {
    this.mapa = mapa;
  }

  /**
   * Prediccion inmediata (F7): CADA input que el cliente compone y manda tambien se aplica local,
   * al instante, con la MISMA resolucion de colisiones que el servidor — el jugador propio deja de
   * esperar el viaje de ida y vuelta para sentir su propio movimiento.
   */
  aplicarInputLocal(input: Input): void {
    this.enviadoEnPorSec.set(input.sec, performance.now());
    this.anguloPredicho = input.apuntar;
    const config = this.config();
    if (config === null || this.mapa === null) {
      return; // recien conectado: todavia no hay config/mapa para simular
    }
    const base = this.posicionPredicha ?? this.posicionPropiaDelUltimoSnapshot();
    if (base === null) {
      return; // todavia no vi mi propia posicion en ningun snapshot
    }
    this.posicionPredicha = simularPasoMovimiento(
      base, input.mover, config.velocidad, 1 / config.tickRate, config.radioJugador,
      this.mapa.ancho, this.mapa.alto, this.mapa.obstaculos,
    );
    this.historialInputs.push({ sec: input.sec, mover: input.mover });
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
    this.reconciliar(snapshot);
    this.actualizarRtt(snapshot);
  }

  /**
   * Reconciliacion (F7): toma la posicion AUTORITATIVA del `ack`, descarta los inputs ya
   * confirmados y reaplica los pendientes encima — si hubo una mispredicción (choque que el
   * cliente no vio igual), el resultado converge solo; si no, reproduce exactamente lo que ya
   * se venia prediciendo.
   */
  private reconciliar(snapshot: Snapshot): void {
    const idPropio = this.idJugador();
    const config = this.config();
    if (idPropio === null || config === null || this.mapa === null) {
      return;
    }
    const ackSec = snapshot.acks[idPropio];
    const jugadorServidor = snapshot.jugadores.find((jugador) => jugador.id === idPropio);
    if (ackSec === undefined || jugadorServidor === undefined || jugadorServidor.estadoVida !== 'VIVO') {
      // Muerto/espectador/todavia sin ack: sin base solida para predecir, cae a la interpolacion normal.
      this.posicionPredicha = null;
      this.offsetVisual = { x: 0, y: 0 };
      this.historialInputs = [];
      return;
    }
    this.historialInputs = this.historialInputs.filter((pendiente) => pendiente.sec > ackSec);
    let posicion: Punto = { x: jugadorServidor.x, y: jugadorServidor.y };
    const dt = 1 / config.tickRate;
    for (const pendiente of this.historialInputs) {
      posicion = simularPasoMovimiento(
        posicion, pendiente.mover, config.velocidad, dt, config.radioJugador,
        this.mapa.ancho, this.mapa.alto, this.mapa.obstaculos,
      );
    }
    this.acumularErrorDeReconciliacion(posicion);
    this.posicionPredicha = posicion;
  }

  /**
   * El error entre lo que ya se estaba mostrando y lo recien reconciliado se guarda como offset
   * visual DECRECIENTE (no se aplica de golpe): en el caso comun (sin mispredicción) el error es
   * ~0 y no pasa nada; en el caso raro, el render lo absorbe suave en unos pocos frames. Un salto
   * grande (teleport/respawn) se cae directo, igual que el snap de interpolacion de los demas.
   */
  private acumularErrorDeReconciliacion(posicionReconciliada: Punto): void {
    if (this.posicionPredicha === null) {
      return;
    }
    const error = {
      x: this.posicionPredicha.x - posicionReconciliada.x,
      y: this.posicionPredicha.y - posicionReconciliada.y,
    };
    const nuevoOffset = { x: this.offsetVisual.x + error.x, y: this.offsetVisual.y + error.y };
    this.offsetVisual = Math.hypot(nuevoOffset.x, nuevoOffset.y) > EstadoPartidaStore.DISTANCIA_SNAP
      ? { x: 0, y: 0 }
      : nuevoOffset;
  }

  /** RTT = ahora que confirmo el ack de una sec, menos cuando esa sec se mando (F7, sin protocolo nuevo). */
  private actualizarRtt(snapshot: Snapshot): void {
    const idPropio = this.idJugador();
    if (idPropio === null) {
      return;
    }
    const ackSec = snapshot.acks[idPropio];
    if (ackSec === undefined) {
      return;
    }
    const enviadoEn = this.enviadoEnPorSec.get(ackSec);
    if (enviadoEn !== undefined) {
      this.rttMs.set(Math.round(performance.now() - enviadoEn));
    }
    for (const sec of this.enviadoEnPorSec.keys()) {
      if (sec <= ackSec) {
        this.enviadoEnPorSec.delete(sec);
      }
    }
    if (this.enviadoEnPorSec.size > EstadoPartidaStore.RTT_MAX_MUESTRAS) {
      const masVieja = Math.min(...this.enviadoEnPorSec.keys());
      this.enviadoEnPorSec.delete(masVieja);
    }
  }

  private posicionPropiaDelUltimoSnapshot(): Punto | null {
    const snapshot = this.ultimoSnapshot();
    const idPropio = this.idJugador();
    if (snapshot === null || idPropio === null) {
      return null;
    }
    const jugador = snapshot.jugadores.find((candidato) => candidato.id === idPropio);
    return jugador === undefined ? null : { x: jugador.x, y: jugador.y };
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
    this.mapa = null;
    this.posicionPredicha = null;
    this.offsetVisual = { x: 0, y: 0 };
    this.anguloPredicho = 0;
    this.historialInputs = [];
    this.enviadoEnPorSec.clear();
    this.rttMs.set(null);
  }

  estadoVisual(ahora: number): EstadoVisual | null {
    if (this.buffer.length === 0) {
      return null;
    }
    const masNuevo = this.buffer[this.buffer.length - 1];
    let estado: EstadoVisual;
    const objetivo = ahora - EstadoPartidaStore.RETRASO_INTERP_MS;
    const par = ahora - masNuevo.recibidoEn > EstadoPartidaStore.EDAD_MAXIMA_MS
      ? null
      : this.parQueEncierra(objetivo);
    if (par === null) {
      estado = this.sinInterpolar(masNuevo.snapshot);
    } else {
      const [anterior, siguiente] = par;
      const rango = siguiente.recibidoEn - anterior.recibidoEn;
      const t = rango <= 0 ? 1 : this.acotar((objetivo - anterior.recibidoEn) / rango);
      estado = this.interpolar(anterior.snapshot, siguiente.snapshot, t);
    }
    return this.conPrediccionPropia(estado);
  }

  /**
   * Reemplaza, SOLO para el jugador propio, la posicion interpolada por la predicha + el offset de
   * correccion (F7): la posicion SIMULADA nunca se demora (nuevos inputs se ven al instante); solo
   * el offset de un eventual error de reconciliacion se va soltando de a poco, frame a frame.
   */
  private conPrediccionPropia(estado: EstadoVisual): EstadoVisual {
    const idPropio = this.idJugador();
    if (idPropio === null || this.posicionPredicha === null) {
      return estado;
    }
    this.offsetVisual = {
      x: this.decaer(this.offsetVisual.x),
      y: this.decaer(this.offsetVisual.y),
    };
    const renderizada = {
      x: this.posicionPredicha.x + this.offsetVisual.x,
      y: this.posicionPredicha.y + this.offsetVisual.y,
    };
    return {
      ...estado,
      jugadores: estado.jugadores.map((jugador) =>
        jugador.id === idPropio
          ? { ...jugador, x: renderizada.x, y: renderizada.y, angulo: this.anguloPredicho }
          : jugador,
      ),
    };
  }

  /** Reduce geometricamente un componente del offset hacia cero, sin quedar temblando por siempre. */
  private decaer(valor: number): number {
    const reducido = valor * (1 - EstadoPartidaStore.DECAIMIENTO_CORRECCION);
    return Math.abs(reducido) < EstadoPartidaStore.OFFSET_DESPRECIABLE ? 0 : reducido;
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
