/**
 * Catalogo unico de personajes jugables (PLAN fase "seleccion de personaje"). Espejo del enum
 * Java `comun/personajes/Personaje`. El `Record` obliga a `tsc` a fallar si falta una clave —
 * unica defensa anti-drift del lado TS (el fixture de contrato cubre el lado Java).
 */

export type Personaje = 'GATO' | 'DINO' | 'ROBO_PERRO' | 'CONEJO' | 'ARDILLA';

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
  GATO: { id: 'GATO', nombre: 'Battle Kat', slug: 'gato', colorCuerpo: 0xf4a341, colorDetalle: 0xfff3e0 },
  DINO: { id: 'DINO', nombre: 'Dino Dude', slug: 'dino', colorCuerpo: 0x4caf50, colorDetalle: 0xc8e6a0 },
  ROBO_PERRO: { id: 'ROBO_PERRO', nombre: 'Robo Pup', slug: 'robo-perro', colorCuerpo: 0x9e9e9e, colorDetalle: 0x64d8e8 },
  CONEJO: { id: 'CONEJO', nombre: 'Sparkle Bunny', slug: 'conejo', colorCuerpo: 0xf5f5f5, colorDetalle: 0xffc1cc },
  ARDILLA: { id: 'ARDILLA', nombre: 'Shadow Squirrel', slug: 'ardilla', colorCuerpo: 0x8d5a2b, colorDetalle: 0xd7a86e },
};

/**
 * Ruta del retrato PNG en `public/` (servido en raiz por angular.json). El componente de retrato
 * cae al SVG vectorial si el archivo no existe — los PNG los provee el usuario, no el repo.
 */
export function rutaRetrato(personaje: Personaje | string | null | undefined): string {
  return `/personajes/${especificacionDe(personaje).slug}.png`;
}

export const LISTA_PERSONAJES: readonly Personaje[] = ['GATO', 'DINO', 'ROBO_PERRO', 'CONEJO', 'ARDILLA'];

const PERSONAJE_POR_DEFECTO: Personaje = 'GATO';

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
