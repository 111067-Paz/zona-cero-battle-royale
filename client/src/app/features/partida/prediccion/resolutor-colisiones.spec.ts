import { describe, expect, it } from 'vitest';
import { RectanguloMapa } from '../../../models/mapa';
import { conLongitudMaxima, resolverColision } from './resolutor-colisiones';

const RADIO = 0.5;
const EPSILON = 1e-6;
const ANCHO = 100;
const ALTO = 100;

/** Mapa 100x100 con UN obstaculo que ocupa [40,60] x [40,60] — espejo del test Java. */
const OBSTACULO_CENTRAL: RectanguloMapa = { x: 40, y: 40, ancho: 20, alto: 20, tipo: 'CAJA' };

function resolver(x: number, y: number): { x: number; y: number } {
  return resolverColision({ x, y }, RADIO, ANCHO, ALTO, [OBSTACULO_CENTRAL]);
}

function casiIgual(a: { x: number; y: number }, b: { x: number; y: number }): void {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
}

describe('resolverColision — circulo vs AABB con deslizamiento (paridad con ResolutorColisionesTest.java)', () => {
  it('penetrando por la izquierda, expulsa a x = borde - radio', () => {
    casiIgual(resolver(39.8, 50.0), { x: 39.5, y: 50.0 });
  });

  it('penetrando por la derecha, expulsa a x = borde + radio', () => {
    casiIgual(resolver(60.2, 50.0), { x: 60.5, y: 50.0 });
  });

  it('penetrando por arriba, expulsa a y = borde - radio', () => {
    casiIgual(resolver(50.0, 39.8), { x: 50.0, y: 39.5 });
  });

  it('sin contacto, la posicion no se toca', () => {
    casiIgual(resolver(10.0, 10.0), { x: 10.0, y: 10.0 });
  });

  it('con el centro DENTRO del obstaculo, expulsa por el eje de menor penetracion', () => {
    // (45,50): mas cerca del borde izquierdo (5) que del resto -> sale por izquierda
    casiIgual(resolver(45.0, 50.0), { x: 39.5, y: 50.0 });
  });

  it('rozando una esquina, el circulo la rodea quedando a distancia radio del vertice', () => {
    const resultado = resolver(39.7, 39.7);
    const distanciaAlVertice = Math.hypot(resultado.x - 40.0, resultado.y - 40.0);
    expect(distanciaAlVertice).toBeCloseTo(RADIO, 6);
  });

  it('deslizamiento: corrige solo la componente normal, conserva la tangencial', () => {
    // Penetra la cara izquierda (x) pero tambien baja (y): la y se conserva, la x se corrige.
    casiIgual(resolver(39.8, 55.0), { x: 39.5, y: 55.0 });
  });

  it('clampa al borde del mapa (radio de margen)', () => {
    const resultado = resolver(0.2, 50.0);
    expect(resultado.x).toBeCloseTo(RADIO, 6);
    expect(resultado.y).toBeCloseTo(50.0, 6);
  });
});

describe('conLongitudMaxima — anti diagonal-mas-rapida', () => {
  it('deja igual un vector cuya longitud ya es menor o igual al maximo', () => {
    const resultado = conLongitudMaxima({ x: 1, y: 0 }, 1.0);
    expect(resultado).toEqual({ x: 1, y: 0 });
  });

  it('recorta una diagonal (1,1) a longitud 1 conservando la direccion', () => {
    const resultado = conLongitudMaxima({ x: 1, y: 1 }, 1.0);
    expect(Math.hypot(resultado.x, resultado.y)).toBeCloseTo(1.0, 6);
    expect(resultado.x).toBeCloseTo(resultado.y, 6);
  });

  it('el vector nulo se queda nulo (sin dividir por cero)', () => {
    const resultado = conLongitudMaxima({ x: 0, y: 0 }, 1.0);
    expect(resultado).toEqual({ x: 0, y: 0 });
  });
});
