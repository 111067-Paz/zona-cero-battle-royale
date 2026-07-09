import { RectanguloMapa } from '../../../models/mapa';

/**
 * Puerto FIEL de {@code ResolutorColisiones.java} (dominio) para la prediccion client-side de la
 * Fase 7 (PLAN §8.6): misma matematica, mismo orden de pasadas. Si el algoritmo del servidor
 * cambia, este archivo se desincroniza — es un acoplamiento consciente, no accidental: la
 * prediccion SOLO tiene sentido si corre la MISMA resolucion que la autoridad.
 *
 * <p>Move-then-resolve: mover primero, corregir despues. Por cada obstaculo penetrado, empuja el
 * centro hacia afuera SOLO por la normal — la componente tangencial se conserva, de donde sale el
 * deslizamiento natural. Repite unas pocas pasadas para solapamientos multiples y clampa a los
 * bordes al final.
 */

export interface Punto {
  x: number;
  y: number;
}

const MAX_PASADAS = 3;
const EPSILON = 1e-9;

export function longitud(v: Punto): number {
  return Math.hypot(v.x, v.y);
}

/** Direccion unitaria; (0,0) si el vector es (casi) nulo, para no dividir por cero al no moverse. */
export function normalizado(v: Punto): Punto {
  const l = longitud(v);
  if (l < EPSILON) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / l, y: v.y / l };
}

/** Recorta la magnitud a `longitudMaxima` conservando la direccion (anti diagonal-mas-rapida). */
export function conLongitudMaxima(v: Punto, longitudMaxima: number): Punto {
  if (longitud(v) <= longitudMaxima) {
    return v;
  }
  const n = normalizado(v);
  return { x: n.x * longitudMaxima, y: n.y * longitudMaxima };
}

function bordeDerecho(o: RectanguloMapa): number {
  return o.x + o.ancho;
}

function bordeInferior(o: RectanguloMapa): number {
  return o.y + o.alto;
}

function contiene(o: RectanguloMapa, p: Punto): boolean {
  return p.x >= o.x && p.x <= bordeDerecho(o) && p.y >= o.y && p.y <= bordeInferior(o);
}

function puntoMasCercanoA(o: RectanguloMapa, p: Punto): Punto {
  const cx = Math.max(o.x, Math.min(p.x, bordeDerecho(o)));
  const cy = Math.max(o.y, Math.min(p.y, bordeInferior(o)));
  return { x: cx, y: cy };
}

/** El centro esta DENTRO del obstaculo: lo expulsa por el eje de MENOR penetracion. */
function empujarDesdeAdentro(centro: Punto, radio: number, o: RectanguloMapa): Punto {
  const haciaIzquierda = centro.x - o.x;
  const haciaDerecha = bordeDerecho(o) - centro.x;
  const haciaArriba = centro.y - o.y;
  const haciaAbajo = bordeInferior(o) - centro.y;

  const minimo = Math.min(haciaIzquierda, haciaDerecha, haciaArriba, haciaAbajo);
  if (minimo === haciaIzquierda) {
    return { x: o.x - radio, y: centro.y };
  }
  if (minimo === haciaDerecha) {
    return { x: bordeDerecho(o) + radio, y: centro.y };
  }
  if (minimo === haciaArriba) {
    return { x: centro.x, y: o.y - radio };
  }
  return { x: centro.x, y: bordeInferior(o) + radio };
}

function resolverContra(centro: Punto, radio: number, o: RectanguloMapa): Punto {
  if (contiene(o, centro)) {
    return empujarDesdeAdentro(centro, radio, o);
  }
  const masCercano = puntoMasCercanoA(o, centro);
  const delta = { x: centro.x - masCercano.x, y: centro.y - masCercano.y };
  const distancia = longitud(delta);
  if (distancia >= radio) {
    return centro; // sin contacto
  }
  if (distancia < EPSILON) {
    return empujarDesdeAdentro(centro, radio, o); // justo sobre el borde
  }
  const penetracion = radio - distancia;
  const normal = { x: delta.x / distancia, y: delta.y / distancia };
  return { x: centro.x + normal.x * penetracion, y: centro.y + normal.y * penetracion };
}

function casiIgual(a: Punto, b: Punto): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function dentroDeLosBordes(p: Punto, radio: number, ancho: number, alto: number): Punto {
  const x = Math.min(ancho - radio, Math.max(radio, p.x));
  const y = Math.min(alto - radio, Math.max(radio, p.y));
  return { x, y };
}

export function resolverColision(
  posicionDeseada: Punto,
  radio: number,
  ancho: number,
  alto: number,
  obstaculos: readonly RectanguloMapa[],
): Punto {
  let posicion = posicionDeseada;
  for (let pasada = 0; pasada < MAX_PASADAS; pasada++) {
    let hubieroCorrecciones = false;
    for (const obstaculo of obstaculos) {
      const corregida = resolverContra(posicion, radio, obstaculo);
      if (!casiIgual(posicion, corregida)) {
        posicion = corregida;
        hubieroCorrecciones = true;
      }
    }
    if (!hubieroCorrecciones) {
      break;
    }
  }
  return dentroDeLosBordes(posicion, radio, ancho, alto);
}

/**
 * Un paso de movimiento completo — el MISMO calculo que {@code Partida.simularMovimiento}
 * (mover.conLongitudMaxima(1) -> escalar por velocidad*dt -> resolver colision). Es la unidad que
 * reutilizan tanto la prediccion inmediata como el replay de reconciliacion.
 */
export function simularPasoMovimiento(
  posicion: Punto,
  mover: Punto,
  velocidad: number,
  dt: number,
  radio: number,
  ancho: number,
  alto: number,
  obstaculos: readonly RectanguloMapa[],
): Punto {
  const direccion = conLongitudMaxima(mover, 1.0);
  const desplazamiento = { x: direccion.x * velocidad * dt, y: direccion.y * velocidad * dt };
  const destino = { x: posicion.x + desplazamiento.x, y: posicion.y + desplazamiento.y };
  return resolverColision(destino, radio, ancho, alto, obstaculos);
}
