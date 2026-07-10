import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { MensajeCliente, MensajeServidor } from '../../models/protocolo';

export type EstadoConexion = 'desconectado' | 'conectando' | 'conectado';

/**
 * Unico dueno del WebSocket de juego (PLAN §7-B). Expone un stream tipado de mensajes entrantes y un
 * metodo `enviar`; ningun componente toca el socket directamente.
 *
 * <p>Aplica el descarte defensivo de R25: mientras no llegue la BIENVENIDA, cualquier SNAPSHOT se
 * ignora (el cliente todavia no sabe quien es). Reconexion con backoff exponencial (1, 2, 4... max
 * 15 s); cada reapertura emite por `abierto$` para que el orquestador reinicie la secuencia y reenvie
 * UNIRSE.
 *
 * <p>Latencia simulada en dev (F7): `?lagMs=150` en la URL retrasa entrada Y salida por mitades
 * (round-trip total = lagMs), para poder probar la prediccion/reconciliacion bajo latencia real sin
 * tocar el servidor. Opt-in por query param — nunca se activa solo.
 */
@Injectable({ providedIn: 'root' })
export class ConexionPartidaService {
  private static readonly BACKOFF_MAX_MS = 15_000;

  private socket: WebSocket | null = null;
  private bienvenidaRecibida = false;
  private reintentos = 0;
  private cerradoManualmente = false;
  private timerReconexion: ReturnType<typeof setTimeout> | null = null;
  private url = '/ws/partida';
  private readonly lagMs = this.leerLagSimulado();

  private readonly mensajesSubject = new Subject<MensajeServidor>();
  private readonly abiertoSubject = new Subject<void>();

  readonly mensajes$: Observable<MensajeServidor> = this.mensajesSubject.asObservable();
  readonly abierto$: Observable<void> = this.abiertoSubject.asObservable();
  readonly estado = signal<EstadoConexion>('desconectado');

  conectar(ruta = '/ws/partida'): void {
    this.url = ruta;
    this.cerradoManualmente = false;
    this.abrir();
  }

  enviar(mensaje: MensajeCliente): void {
    if (this.lagMs > 0) {
      setTimeout(() => this.enviarYa(mensaje), this.lagMs / 2);
      return;
    }
    this.enviarYa(mensaje);
  }

  private enviarYa(mensaje: MensajeCliente): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(mensaje));
    }
  }

  desconectar(): void {
    this.cerradoManualmente = true;
    this.cancelarReconexion();
    if (this.socket) {
      this.socket.close(1000, 'cierre normal');
      this.socket = null;
    }
    this.estado.set('desconectado');
  }

  /**
   * Corta el backoff de reconexion SIN cerrar el socket: tras FIN_PARTIDA el servidor va a cerrar
   * cuando venza la gracia, y reconectarse a una partida muerta seria un ciclo infinito de
   * "conectando" (el podio sigue visible; los ultimos snapshots ya llegaron).
   */
  dejarDeReconectar(): void {
    this.cerradoManualmente = true;
    this.cancelarReconexion();
  }

  private abrir(): void {
    this.estado.set('conectando');
    this.bienvenidaRecibida = false;
    const socket = new WebSocket(this.urlAbsoluta(this.url));
    this.socket = socket;

    socket.onopen = () => {
      this.reintentos = 0;
      this.estado.set('conectado');
      this.abiertoSubject.next();
    };
    socket.onmessage = (evento: MessageEvent<string>) => {
      if (this.lagMs > 0) {
        setTimeout(() => this.manejarMensaje(evento.data), this.lagMs / 2);
        return;
      }
      this.manejarMensaje(evento.data);
    };
    socket.onclose = () => this.alCerrar();
    socket.onerror = () => socket.close();
  }

  private manejarMensaje(data: string): void {
    let mensaje: MensajeServidor;
    try {
      mensaje = JSON.parse(data) as MensajeServidor;
    } catch {
      return;
    }
    if (!this.bienvenidaRecibida && mensaje.tipo !== 'BIENVENIDA') {
      return; // R25: nada antes de la BIENVENIDA
    }
    if (mensaje.tipo === 'BIENVENIDA') {
      this.bienvenidaRecibida = true;
    }
    this.mensajesSubject.next(mensaje);
  }

  private alCerrar(): void {
    this.estado.set('desconectado');
    this.socket = null;
    if (!this.cerradoManualmente) {
      this.programarReconexion();
    }
  }

  private programarReconexion(): void {
    const espera = Math.min(ConexionPartidaService.BACKOFF_MAX_MS, 1000 * 2 ** this.reintentos);
    this.reintentos++;
    this.timerReconexion = setTimeout(() => this.abrir(), espera);
  }

  private cancelarReconexion(): void {
    if (this.timerReconexion !== null) {
      clearTimeout(this.timerReconexion);
      this.timerReconexion = null;
    }
  }

  private urlAbsoluta(ruta: string): string {
    const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocolo}://${window.location.host}${ruta}`;
  }

  private leerLagSimulado(): number {
    const valor = new URLSearchParams(window.location.search).get('lagMs');
    const numero = valor === null ? 0 : Number(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
  }
}
