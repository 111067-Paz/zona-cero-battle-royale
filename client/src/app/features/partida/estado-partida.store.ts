import { Injectable, signal } from '@angular/core';
import {
  Bienvenida,
  ConfigBienvenida,
  EstadoPartida,
  JugadorSnapshot,
  Snapshot,
} from '../../models/protocolo';
import { EstadoVisual, JugadorVisual } from './estado-visual';

interface SnapshotFechado {
  recibidoEn: number;
  snapshot: Snapshot;
}

/**
 * Buffer de snapshots + interpolacion (PLAN §7-C pasos 7-8). Recibe el stream del servidor, mantiene
 * los ultimos {@link BUFFER_MAX} y produce el estado visual pidiendo render ~100 ms EN EL PASADO,
 * interpolando entre los dos snapshots que encierran ese instante.
 *
 * <p>Separacion clave (zoneless): los signals del HUD se actualizan SOLO al llegar un snapshot
 * (<=15/s), nunca por frame. El renderer, en cambio, llama a {@link estadoVisual} a 60 fps sin tocar
 * signals. Reglas anti-bug: descarte de ticks viejos/duplicados, arco corto de angulos (R8), snap sin
 * lerp si la distancia supera {@link DISTANCIA_SNAP} (R9) y resincronizacion fria si el buffer quedo
 * viejo (pestana en background).
 */
@Injectable({ providedIn: 'root' })
export class EstadoPartidaStore {
  private static readonly BUFFER_MAX = 30;
  private static readonly RETRASO_INTERP_MS = 100;
  private static readonly DISTANCIA_SNAP = 3;
  private static readonly EDAD_MAXIMA_MS = 1000;

  private buffer: SnapshotFechado[] = [];
  private ultimoTick = -1;

  readonly config = signal<ConfigBienvenida | null>(null);
  readonly idJugador = signal<string | null>(null);
  readonly idPartida = signal<string | null>(null);
  readonly idMapa = signal<string | null>(null);

  /** Ultimo snapshot recibido, para los signals del HUD (HP, kills, estado, etc.). */
  readonly ultimoSnapshot = signal<Snapshot | null>(null);

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
    this.ultimoTick = snapshot.tick;
    this.buffer.push({ recibidoEn: performance.now(), snapshot });
    if (this.buffer.length > EstadoPartidaStore.BUFFER_MAX) {
      this.buffer.shift();
    }
    this.ultimoSnapshot.set(snapshot);
  }

  reiniciar(): void {
    this.buffer = [];
    this.ultimoTick = -1;
    this.ultimoSnapshot.set(null);
  }

  /**
   * Estado interpolado para el instante {@code ahora} (tipicamente {@code performance.now()}).
   * Devuelve null si aun no hay datos. Si el snapshot mas nuevo quedo viejo (> 1 s), hace
   * resincronizacion fria: dibuja ese ultimo estado sin interpolar en lugar de estirar un hueco.
   */
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
    return { tick: siguiente.tick, estado: siguiente.estado, jugadores };
  }

  private interpolarJugador(
    origen: JugadorSnapshot | undefined,
    destino: JugadorSnapshot,
    t: number,
  ): JugadorVisual {
    if (origen === undefined || this.distancia(origen, destino) > EstadoPartidaStore.DISTANCIA_SNAP) {
      return this.visualDe(destino); // spawn o teleport: snap sin lerp (R9)
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
    };
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

  /** Interpola angulos por el arco corto: nunca cruza +-pi por el camino largo (R8). */
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
