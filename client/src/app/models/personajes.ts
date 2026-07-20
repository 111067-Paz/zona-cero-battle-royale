/**
 * Catalogo unico de personajes jugables (PLAN fase "seleccion de personaje"). Espejo del enum
 * Java `comun/personajes/Personaje`. El `Record` obliga a `tsc` a fallar si falta una clave —
 * unica defensa anti-drift del lado TS (el fixture de contrato cubre el lado Java).
 */

export type Personaje =
  | 'BARBARROJA'
  | 'PIRATA_ANNE'
  | 'PIRATA_HENRY'
  | 'ESQUELETO'
  | 'TIBURON'
  | 'MAKO'
  | 'SHARK'
  | 'GATO'
  | 'DINO'
  | 'ROBO_PERRO'
  | 'CONEJO'
  | 'ARDILLA';

export interface EspecificacionPersonaje {
  id: Personaje;
  /** Nombre de display (los del mockup "Matchmaking Lobby"). El enum/wire sigue siendo el id. */
  nombre: string;
  /** Nombre de archivo del retrato PNG en `public/personajes/` (sin extension). */
  slug: string;
  /** 0xRRGGBB, listo para PixiJS Graphics (fill numerico). */
  colorCuerpo: number;
  /** Segundo tono (vientre/detalle), tambien numerico para PixiJS. */
  colorDetalle: number;
}

export const PERSONAJES: Record<Personaje, EspecificacionPersonaje> = {
  BARBARROJA: { id: 'BARBARROJA', nombre: 'Capitán Barbarroja', slug: 'barbarroja', colorCuerpo: 0xd97706, colorDetalle: 0xfef3c7 },
  PIRATA_ANNE: { id: 'PIRATA_ANNE', nombre: 'Pirata Anne', slug: 'pirata_anne', colorCuerpo: 0xec4899, colorDetalle: 0xfce7f3 },
  PIRATA_HENRY: { id: 'PIRATA_HENRY', nombre: 'Pirata Henry', slug: 'pirata_henry', colorCuerpo: 0x3b82f6, colorDetalle: 0xdbeafe },
  ESQUELETO: { id: 'ESQUELETO', nombre: 'Esqueleto Pirata', slug: 'esqueleto', colorCuerpo: 0x94a3b8, colorDetalle: 0xf1f5f9 },
  TIBURON: { id: 'TIBURON', nombre: 'Tiburón Pirata', slug: 'tiburon', colorCuerpo: 0x06b6d4, colorDetalle: 0xcffafe },
  MAKO: { id: 'MAKO', nombre: 'Pirata Mako', slug: 'pirata_henry', colorCuerpo: 0x10b981, colorDetalle: 0xd1fae5 },
  SHARK: { id: 'SHARK', nombre: 'Tiburón Voraz', slug: 'tiburon', colorCuerpo: 0x6366f1, colorDetalle: 0xe0e7ff },

  // Compatibilidad legacy
  GATO: { id: 'GATO', nombre: 'Capitán Barbarroja', slug: 'barbarroja', colorCuerpo: 0xd97706, colorDetalle: 0xfef3c7 },
  DINO: { id: 'DINO', nombre: 'Pirata Anne', slug: 'pirata_anne', colorCuerpo: 0xec4899, colorDetalle: 0xfce7f3 },
  ROBO_PERRO: { id: 'ROBO_PERRO', nombre: 'Pirata Henry', slug: 'pirata_henry', colorCuerpo: 0x3b82f6, colorDetalle: 0xdbeafe },
  CONEJO: { id: 'CONEJO', nombre: 'Esqueleto Pirata', slug: 'esqueleto', colorCuerpo: 0x94a3b8, colorDetalle: 0xf1f5f9 },
  ARDILLA: { id: 'ARDILLA', nombre: 'Tiburón Pirata', slug: 'tiburon', colorCuerpo: 0x06b6d4, colorDetalle: 0xcffafe },
};

/**
 * Ruta del retrato PNG en `public/` (servido en raiz por angular.json). El componente de retrato
 * cae al SVG vectorial si el archivo no existe — los PNG los provee el usuario, no el repo.
 */
export function rutaRetrato(personaje: Personaje | string | null | undefined): string {
  return `/personajes/${especificacionDe(personaje).slug}.png`;
}

export const LISTA_PERSONAJES: readonly Personaje[] = [
  'BARBARROJA',
  'PIRATA_ANNE',
  'PIRATA_HENRY',
  'ESQUELETO',
  'TIBURON',
  'MAKO',
  'SHARK',
];

const PERSONAJE_POR_DEFECTO: Personaje = 'BARBARROJA';

/** Fallback GATO para sesiones pre-deploy (localStorage sin `personaje`) o texto invalido. */
export function especificacionDe(personaje: Personaje | string | null | undefined): EspecificacionPersonaje {
  if (personaje === null || personaje === undefined) {
    return PERSONAJES[PERSONAJE_POR_DEFECTO];
  }
  return PERSONAJES[personaje as Personaje] ?? PERSONAJES[PERSONAJE_POR_DEFECTO];
}

/** Numero 0xRRGGBB -> string CSS `#rrggbb`, para el SVG del retrato. */
export function hexCss(colorNumerico: number): string {
  return '#' + colorNumerico.toString(16).padStart(6, '0');
}
