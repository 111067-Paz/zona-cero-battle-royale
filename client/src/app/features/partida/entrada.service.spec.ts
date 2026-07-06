import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../models/protocolo';
import { EntradaService } from './entrada.service';

function canvasFalso(): HTMLCanvasElement {
  return {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLCanvasElement;
}

describe('EntradaService', () => {
  let service: EntradaService;
  let capturados: Input[];

  beforeEach(() => {
    vi.useFakeTimers();
    service = new EntradaService();
    capturados = [];
    service.iniciar(canvasFalso(), (input) => capturados.push(input));
  });

  afterEach(() => {
    service.detener();
    vi.useRealTimers();
  });

  it('la secuencia es estrictamente creciente en cada muestreo', () => {
    vi.advanceTimersByTime(33);
    vi.advanceTimersByTime(33);

    expect(capturados[0].sec).toBe(1);
    expect(capturados[1].sec).toBe(2);
  });

  it('traduce la tecla W a un vector de movimiento hacia arriba', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));

    vi.advanceTimersByTime(33);

    expect(capturados[0].mover).toEqual({ x: 0, y: -1 });
  });

  it('blur de la ventana limpia todas las teclas (evita el jugador corriendo solo)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    vi.advanceTimersByTime(33);
    expect(capturados[0].mover).toEqual({ x: 1, y: 0 });

    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(33);

    expect(capturados[1].mover).toEqual({ x: 0, y: 0 });
  });

  it('reiniciarSecuencia vuelve a arrancar la sec en 1', () => {
    vi.advanceTimersByTime(33);
    vi.advanceTimersByTime(33);

    service.reiniciarSecuencia();
    vi.advanceTimersByTime(33);

    expect(capturados[2].sec).toBe(1);
  });
});
