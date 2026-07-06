import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JugadorSnapshot, Snapshot } from '../../models/protocolo';
import { EstadoPartidaStore } from './estado-partida.store';

function jugador(id: string, x: number, y: number, angulo = 0): JugadorSnapshot {
  return { id, x, y, angulo, hp: 100, estadoVida: 'VIVO', conectado: true };
}

function snapshot(tick: number, jugadores: JugadorSnapshot[]): Snapshot {
  return { v: 1, tipo: 'SNAPSHOT', tick, estado: 'EN_CURSO', tickInicio: 0, acks: {}, jugadores };
}

describe('EstadoPartidaStore', () => {
  let store: EstadoPartidaStore;
  let tiempo: number;

  beforeEach(() => {
    tiempo = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => tiempo);
    store = new EstadoPartidaStore();
  });

  it('interpola linealmente la posicion entre dos snapshots', () => {
    tiempo = 1000;
    store.aplicarSnapshot(snapshot(2, [jugador('j-1', 0, 0)]));
    tiempo = 1100;
    store.aplicarSnapshot(snapshot(4, [jugador('j-1', 2, 0)]));

    // objetivo = 1150 - 100 = 1050, a mitad de camino entre 1000 y 1100 -> t = 0.5
    const estado = store.estadoVisual(1150);

    expect(estado).not.toBeNull();
    expect(estado!.jugadores[0].x).toBeCloseTo(1, 5);
  });

  it('hace snap sin lerp cuando la distancia entre snapshots supera 3u (teleport/spawn)', () => {
    tiempo = 1000;
    store.aplicarSnapshot(snapshot(2, [jugador('j-1', 0, 0)]));
    tiempo = 1100;
    store.aplicarSnapshot(snapshot(4, [jugador('j-1', 10, 0)]));

    const estado = store.estadoVisual(1150);

    expect(estado!.jugadores[0].x).toBe(10);
  });

  it('interpola angulos por el arco corto, sin cruzar +-pi por el camino largo', () => {
    tiempo = 1000;
    store.aplicarSnapshot(snapshot(2, [jugador('j-1', 0, 0, 3.0)]));
    tiempo = 1100;
    store.aplicarSnapshot(snapshot(4, [jugador('j-1', 0, 0, -3.0)]));

    const estado = store.estadoVisual(1150);

    // Por el arco corto pasa cerca de pi (~3.14), NO por 0.
    expect(Math.abs(estado!.jugadores[0].angulo)).toBeGreaterThan(3.0);
  });

  it('descarta un snapshot con tick menor o igual al ultimo', () => {
    tiempo = 1000;
    store.aplicarSnapshot(snapshot(5, [jugador('j-1', 0, 0)]));
    store.aplicarSnapshot(snapshot(3, [jugador('j-1', 9, 9)]));

    expect(store.ultimoSnapshot()!.tick).toBe(5);
  });

  it('devuelve null si todavia no llego ningun snapshot', () => {
    expect(store.estadoVisual(1000)).toBeNull();
  });
});
