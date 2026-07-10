/**
 * Tipos del mapa estatico (PLAN §5.2). Espejo de `MapaDto` del servidor y del fixture
 * `contratos/fixtures/mapa.json`. El cliente lo baja UNA vez por REST al recibir BIENVENIDA para
 * dibujar el fondo; no llega por snapshots porque no cambia durante la partida.
 */

export type TipoObstaculo = 'CAJA' | 'ARBOL' | 'ROCA' | 'CARPA';

export interface RectanguloMapa {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  tipo: TipoObstaculo;
}

export interface DecoracionMapa {
  /** RIO | FLOR | ... El renderer decide con que color/sprite dibujarla. Sin colision. */
  tipo: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Mapa {
  id: string;
  ancho: number;
  alto: number;
  obstaculos: RectanguloMapa[];
  decoraciones: DecoracionMapa[];
}
