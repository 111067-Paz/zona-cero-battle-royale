import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MensajeCliente } from '../../models/protocolo';
import { ConexionPartidaService } from './conexion-partida.service';

class WebSocketFalso {
  static readonly OPEN = 1;
  static instancia: WebSocketFalso | null = null;

  readonly readyState = WebSocketFalso.OPEN;
  readonly enviados: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((evento: MessageEvent<string>) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    WebSocketFalso.instancia = this;
  }

  send(mensaje: string): void {
    this.enviados.push(mensaje);
  }

  close(): void {
    this.onclose?.();
  }
}

describe('ConexionPartidaService', () => {
  let service: ConexionPartidaService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost:4200', search: '?lagMs=150' },
    });
    vi.stubGlobal('WebSocket', WebSocketFalso);
    service = new ConexionPartidaService();
  });

  afterEach(() => {
    service.desconectar();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('enviar_con150msSimulados_retrasaLaSalidaLaMitadDelRTT', () => {
    service.conectar();
    const socket = WebSocketFalso.instancia!;
    socket.onopen?.();

    const mensaje: MensajeCliente = { v: 1, tipo: 'SALIR' };
    service.enviar(mensaje);

    vi.advanceTimersByTime(74);
    expect(socket.enviados).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(socket.enviados).toHaveLength(1);
    expect(JSON.parse(socket.enviados[0])).toEqual(mensaje);
  });

  it('mensajeEntrante_con150msSimulados_retrasaLaEntregaLaMitadDelRTT', () => {
    const recibidos: string[] = [];
    service.mensajes$.subscribe((mensaje) => recibidos.push(mensaje.tipo));
    service.conectar();
    const socket = WebSocketFalso.instancia!;
    socket.onopen?.();

    socket.onmessage?.({ data: JSON.stringify({ tipo: 'BIENVENIDA' }) } as MessageEvent<string>);

    vi.advanceTimersByTime(74);
    expect(recibidos).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(recibidos).toEqual(['BIENVENIDA']);
  });

  it('mensajeEntranteAntesDeBienvenida_esDescartadoAunqueLlegueTrasLaLatencia', () => {
    const recibidos: string[] = [];
    service.mensajes$.subscribe((mensaje) => recibidos.push(mensaje.tipo));
    service.conectar();
    const socket = WebSocketFalso.instancia!;
    socket.onopen?.();

    socket.onmessage?.({ data: JSON.stringify({ tipo: 'SNAPSHOT', tick: 1 }) } as MessageEvent<string>);
    vi.advanceTimersByTime(75);

    expect(recibidos).toEqual([]);
  });

  it('snapshotEntrante_registraBytesUtf8YCantidadRecibida', () => {
    service.conectar();
    const socket = WebSocketFalso.instancia!;
    socket.onopen?.();
    socket.onmessage?.({ data: JSON.stringify({ tipo: 'BIENVENIDA' }) } as MessageEvent<string>);
    vi.advanceTimersByTime(75);

    const snapshot = JSON.stringify({ tipo: 'SNAPSHOT', tick: 1, texto: 'á' });
    socket.onmessage?.({ data: snapshot } as MessageEvent<string>);
    vi.advanceTimersByTime(75);

    expect(service.snapshotsRecibidos()).toBe(1);
    expect(service.ultimoSnapshotBytes()).toBe(new TextEncoder().encode(snapshot).length);
  });
});
