import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Evento, JugadorSnapshot, ProyectilSnapshot, Snapshot } from '../../models/protocolo';
import { EstadoPartidaStore } from './estado-partida.store';

function jugador(id: string, x: number, y: number, angulo = 0, hp = 100): JugadorSnapshot {
  return {
    id, x, y, angulo, hp, estadoVida: 'VIVO', conectado: true, arma: 'PISTOLA', kills: 0, botiquines: 0,
  };
}

function snapshot(
  tick: number,
  jugadores: JugadorSnapshot[],
  proyectiles: ProyectilSnapshot[] = [],
): Snapshot {
  return {
    v: 1, tipo: 'SNAPSHOT', tick, estado: 'EN_CURSO', tickInicio: 0, ticksParaInicio: null, acks: {},
    jugadores, proyectiles, zona: null, botines: [],
  };
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

  it('genera un numero de dano cuando el HP de un jugador baja entre snapshots (R29)', () => {
    tiempo = 1000;
    store.aplicarSnapshot(snapshot(2, [jugador('j-1', 5, 5, 0, 100)]));
    tiempo = 1050;
    store.aplicarSnapshot(snapshot(4, [jugador('j-1', 5, 5, 0, 80)]));

    const estado = store.estadoVisual(1050);

    expect(estado!.numerosDanio.length).toBe(1);
    expect(estado!.numerosDanio[0].cantidad).toBe(20);
  });

  it('arma el kill feed desde un EVENTO KILL', () => {
    const evento: Evento = {
      v: 1,
      tipo: 'EVENTO',
      evento: 'KILL',
      datos: { asesino: 'j-2', victima: 'j-1', arma: 'PISTOLA' },
    };

    store.aplicarEvento(evento);

    expect(store.killFeed().length).toBe(1);
    expect(store.killFeed()[0].victima).toBe('j-1');
  });

  it('interpola un proyectil conocido y hace snap de uno nuevo por su idRed', () => {
    tiempo = 1000;
    store.aplicarSnapshot(snapshot(2, [jugador('j-1', 0, 0)], [proyectil(1, 0, 0)]));
    tiempo = 1100;
    store.aplicarSnapshot(snapshot(4, [jugador('j-1', 0, 0)], [proyectil(1, 8, 0), proyectil(2, 50, 50)]));

    const estado = store.estadoVisual(1150);

    const conocido = estado!.proyectiles.find((p) => p.id === 1)!;
    const nuevo = estado!.proyectiles.find((p) => p.id === 2)!;
    expect(conocido.x).toBeCloseTo(4, 5); // interpolado a t=0.5
    expect(nuevo.x).toBe(50); // nuevo -> snap
  });
});

function proyectil(id: number, x: number, y: number): ProyectilSnapshot {
  return { id, x, y, angulo: 0 };
}
