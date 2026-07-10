import { TipoObstaculo } from '../../../models/mapa';

/**
 * Colores y alturas por tipo de obstaculo/decoracion (Decision de arquitectura #6, B6): la unica
 * fuente de verdad visual que consumen AMBOS renderers, para que "caja marron generica" se
 * convierta en 4 siluetas distinguibles sin duplicar la paleta en cada uno.
 */
export interface EspecificacionObstaculo {
  /** Tono principal (techo/relleno en 2D, cara superior en ISO). */
  colorPrincipal: number;
  /** Tono secundario (detalle: tablas de la caja, tronco del arbol, base de la carpa). */
  colorSecundario: number;
  /** Altura de extrusion en pixeles para el renderer isometrico. */
  alturaPx: number;
}

const PALETA_OBSTACULOS: Record<TipoObstaculo, EspecificacionObstaculo> = {
  CAJA: { colorPrincipal: 0xb5834a, colorSecundario: 0x8a5f33, alturaPx: 26 },
  ARBOL: { colorPrincipal: 0x4c8c3a, colorSecundario: 0x6b4226, alturaPx: 40 },
  ROCA: { colorPrincipal: 0x8f97a3, colorSecundario: 0x6e7580, alturaPx: 18 },
  CARPA: { colorPrincipal: 0xd94f4f, colorSecundario: 0xf0e4c8, alturaPx: 30 },
};

export function especificacionObstaculo(tipo: TipoObstaculo): EspecificacionObstaculo {
  return PALETA_OBSTACULOS[tipo];
}

export const COLOR_CESPED = 0x82c341;
export const COLOR_CESPED_CLARO = 0x8fce4d;
export const COLOR_CESPED_OSCURO = 0x74b338;
export const COLOR_RIO = 0x3aa7d8;
export const COLOR_RIO_CLARO = 0x6fc3e6;
export const COLOR_LAGO = 0x2f7fb0;
export const COLOR_LAGO_CLARO = 0x4fa3d6;
export const COLOR_CAMINO = 0xcbb488;
export const COLOR_CAMINO_BORDE = 0xb59a6b;
export const COLOR_FLOR_PETALO = 0xff8fc7;
export const COLOR_FLOR_CENTRO = 0xffe066;
export const COLOR_ARBUSTO = 0x4a933e;
export const COLOR_ARBUSTO_CLARO = 0x66b34e;

/** Fase animada 0..1 para el agua (RIO/LAGO): un ciclo lento, sin estado propio (deriva del reloj). */
export function faseAgua(ahoraMs: number, periodoMs = 2400): number {
  return (ahoraMs % periodoMs) / periodoMs;
}

/** Posicion determinista de flores dentro de una decoracion FLOR, a partir de sus propias coordenadas (sin Math.random: mismo mapa, mismo dibujo siempre). */
export function semillaDeterministica(x: number, y: number): number {
  const valor = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return valor - Math.floor(valor);
}

/** Interpola 0xRRGGBB entre dos colores (agua "respirando", relieve de los prismas ISO). */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
