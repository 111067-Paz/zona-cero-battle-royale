import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Mapa } from '../../models/mapa';
import { ConfigBienvenida, Evento, Input, JugadorSnapshot, ProyectilSnapshot, Snapshot } from '../../models/protocolo';
import { EstadoPartidaStore } from './estado-partida.store';

function jugador(
  id: string,
  x: number,
  y: number,
  angulo = 0,
  hp = 100,
  estadoVida: 'VIVO' | 'MUERTO' = 'VIVO',
): JugadorSnapshot {
  return {
    id, x, y, angulo, hp, estadoVida, conectado: true, arma: 'PISTOLA', kills: 0, botiquines: 0,
  };
}

function snapshot(
  tick: number,
  jugadores: JugadorSnapshot[],
  proyectiles: ProyectilSnapshot[] = [],
  acks: Record<string, number> = {},
): Snapshot {
  return {
    v: 1, tipo: 'SNAPSHOT', tick, estado: 'EN_CURSO', tickInicio: 0, ticksParaInicio: null, acks,
    jugadores, proyectiles, zona: null, botines: [],
  };
}

const CONFIG: ConfigBienvenida = { tickRate: 30, snapshotRate: 15, mundo: 100, velocidad: 5, radioJugador: 0.5 };
const MAPA_SIN_OBSTACULOS: Mapa = { id: 'test', ancho: 100, alto: 100, obstaculos: [], decoraciones: [] };

function input(sec: number, moverX: number, moverY: number, apuntar = 0): Input {
  return { v: 1, tipo: 'INPUT', sec, mover: { x: moverX, y: moverY }, apuntar, disparar: false, acciones: [] };
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

  describe('Prediccion y reconciliacion del movimiento propio (F7)', () => {
    const BASE_X = 50;
    const BASE_Y = 50;
    const DT = 1 / CONFIG.tickRate;

    function conectar(idJugador = 'j-1'): void {
      store.aplicarBienvenida({ v: 1, tipo: 'BIENVENIDA', idJugador, idPartida: 'p-1', config: CONFIG, idMapa: 'test' });
      store.establecerMapa(MAPA_SIN_OBSTACULOS);
    }

    it('predice la posicion propia al instante, sin esperar el snapshot', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));

      store.aplicarInputLocal(input(1, 1, 0));

      const yo = store.estadoVisual(1000)!.jugadores.find((j) => j.id === 'j-1')!;
      expect(yo.x).toBeCloseTo(BASE_X + CONFIG.velocidad * DT, 6);
      expect(yo.y).toBeCloseTo(BASE_Y, 6);
    });

    it('el angulo propio sigue al ultimo input enviado, sin esperar el viaje de ida y vuelta', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));

      store.aplicarInputLocal(input(1, 0, 0, 1.57));

      const yo = store.estadoVisual(1000)!.jugadores.find((j) => j.id === 'j-1')!;
      expect(yo.angulo).toBeCloseTo(1.57, 5);
    });

    it('sin mispredicción, la reconciliacion reproduce exactamente lo ya predicho (sin offset)', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));
      store.aplicarInputLocal(input(1, 1, 0));
      const xPredicho = BASE_X + CONFIG.velocidad * DT;

      tiempo = 1050;
      store.aplicarSnapshot(snapshot(2, [jugador('j-1', xPredicho, BASE_Y)], [], { 'j-1': 1 }));

      const yo = store.estadoVisual(1050)!.jugadores.find((j) => j.id === 'j-1')!;
      expect(yo.x).toBeCloseTo(xPredicho, 6);
    });

    it('una mispredicción chica se absorbe de a poco (converge, no salta de golpe)', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));
      store.aplicarInputLocal(input(1, 1, 0));

      // El servidor confirma una posicion LIGERAMENTE distinta a la predicha.
      tiempo = 1050;
      store.aplicarSnapshot(snapshot(2, [jugador('j-1', BASE_X + 0.1, BASE_Y)], [], { 'j-1': 1 }));

      const primerFrame = store.estadoVisual(1050)!.jugadores.find((j) => j.id === 'j-1')!;
      const segundoFrame = store.estadoVisual(1051)!.jugadores.find((j) => j.id === 'j-1')!;
      const objetivo = BASE_X + CONFIG.velocidad * DT; // lo que ya se venia mostrando

      expect(Math.abs(primerFrame.x - objetivo)).toBeGreaterThan(0); // no cae de golpe al valor reconciliado
      expect(Math.abs(segundoFrame.x - objetivo)).toBeLessThan(Math.abs(primerFrame.x - objetivo)); // converge
    });

    it('una mispredicción grande (teleport/respawn) se cae directo, sin arrastre', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));
      store.aplicarInputLocal(input(1, 1, 0));

      tiempo = 1050;
      store.aplicarSnapshot(snapshot(2, [jugador('j-1', 10, 10)], [], { 'j-1': 1 }));

      const yo = store.estadoVisual(1050)!.jugadores.find((j) => j.id === 'j-1')!;
      expect(yo.x).toBeCloseTo(10, 6);
      expect(yo.y).toBeCloseTo(10, 6);
    });

    it('un jugador propio MUERTO deja de predecirse y muestra la posicion del servidor', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));
      store.aplicarInputLocal(input(1, 1, 0));

      tiempo = 1050;
      store.aplicarSnapshot(snapshot(2, [jugador('j-1', 5, 5, 0, 0, 'MUERTO')], [], { 'j-1': 1 }));

      const yo = store.estadoVisual(1050)!.jugadores.find((j) => j.id === 'j-1')!;
      expect(yo.x).toBeCloseTo(5, 6);
      expect(yo.y).toBeCloseTo(5, 6);
    });

    it('calcula el RTT desde cuando se mando la sec hasta que llego su ack, sin protocolo nuevo', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));
      tiempo = 1005;
      store.aplicarInputLocal(input(1, 1, 0));

      tiempo = 1145; // 140ms despues de haber mandado la sec 1
      store.aplicarSnapshot(snapshot(2, [jugador('j-1', BASE_X + 0.1, BASE_Y)], [], { 'j-1': 1 }));

      expect(store.rttMs()).toBe(140);
    });

    it('sin ack todavia para el jugador propio, el RTT queda null', () => {
      conectar();
      tiempo = 1000;
      store.aplicarSnapshot(snapshot(1, [jugador('j-1', BASE_X, BASE_Y)]));

      expect(store.rttMs()).toBeNull();
    });
  });
});

function proyectil(id: number, x: number, y: number): ProyectilSnapshot {
  return { id, x, y, angulo: 0 };
}
