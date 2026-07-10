/**
 * Catalogo unico de personajes jugables (PLAN fase "seleccion de personaje"). Espejo del enum
 * Java `comun/personajes/Personaje`. El `Record` obliga a `tsc` a fallar si falta una clave —
 * unica defensa anti-drift del lado TS (el fixture de contrato cubre el lado Java).
 */

export type Personaje = 'GATO' | 'DINO' | 'ROBO_PERRO' | 'CONEJO' | 'ARDILLA';

export interface EspecificacionPersonaje {
  id: Personaje;
  nombre: string;
  /** 0xRRGGBB, listo para PixiJS Graphics (fill numerico). */
  colorCuerpo: number;
  /** Segundo tono (vientre/detalle), tambien numerico para PixiJS. */
  colorDetalle: number;
}

export const PERSONAJES: Record<Personaje, EspecificacionPersonaje> = {
  GATO: { id: 'GATO', nombre: 'Gato', colorCuerpo: 0xf4a341, colorDetalle: 0xfff3e0 },
  DINO: { id: 'DINO', nombre: 'Dino', colorCuerpo: 0x4caf50, colorDetalle: 0xc8e6a0 },
  ROBO_PERRO: { id: 'ROBO_PERRO', nombre: 'Robo-Perro', colorCuerpo: 0x9e9e9e, colorDetalle: 0x64d8e8 },
  CONEJO: { id: 'CONEJO', nombre: 'Conejo', colorCuerpo: 0xf5f5f5, colorDetalle: 0xffc1cc },
  ARDILLA: { id: 'ARDILLA', nombre: 'Ardilla', colorCuerpo: 0x8d5a2b, colorDetalle: 0xd7a86e },
};

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
