import { Injectable } from '@angular/core';
import { AccionJugador, Input, VERSION_PROTOCOLO } from '../../models/protocolo';

/**
 * Traduce teclado y mouse a INTENCION abstracta (PLAN §7-C). No conoce el WebSocket: compone un
 * {@link Input} cada 33 ms (30 Hz) y lo entrega a un emisor. Ese flujo constante ES el heartbeat, y
 * corre en TODOS los estados de la partida (R24), no solo jugando.
 *
 * <p>Detalles anti-bug: `blur` de la ventana limpia TODAS las teclas (un keyup perdido dejaria al
 * jugador corriendo solo); la `sec` es estrictamente creciente y se reinicia con la conexion.
 */
@Injectable({ providedIn: 'root' })
export class EntradaService {
  private static readonly HZ = 30;

  private readonly teclas = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private disparando = false;
  private sec = 0;
  private accionesPendientes: AccionJugador[] = [];

  private canvas: HTMLCanvasElement | null = null;
  private emisor: ((input: Input) => void) | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  private readonly alPresionar = (e: KeyboardEvent) => {
    const tecla = e.key.toLowerCase();
    this.teclas.add(tecla);
    if (e.repeat) {
      return; // acciones one-shot: solo en el flanco de bajada, no mientras se mantiene apretada
    }
    if (tecla === 'e') {
      this.accionesPendientes.push('RECOGER');
    } else if (tecla === 'q') {
      this.accionesPendientes.push('USAR_BOTIQUIN');
    }
  };
  private readonly alSoltar = (e: KeyboardEvent) => this.teclas.delete(e.key.toLowerCase());
  private readonly alMover = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };
  private readonly alPresionarMouse = (e: MouseEvent) => {
    if (e.button === 0) {
      this.disparando = true;
    }
  };
  private readonly alSoltarMouse = (e: MouseEvent) => {
    if (e.button === 0) {
      this.disparando = false;
    }
  };
  private readonly alPerderFoco = () => this.limpiar();

  iniciar(canvas: HTMLCanvasElement, emisor: (input: Input) => void): void {
    this.canvas = canvas;
    this.emisor = emisor;
    window.addEventListener('keydown', this.alPresionar);
    window.addEventListener('keyup', this.alSoltar);
    window.addEventListener('mousemove', this.alMover);
    window.addEventListener('mousedown', this.alPresionarMouse);
    window.addEventListener('mouseup', this.alSoltarMouse);
    window.addEventListener('blur', this.alPerderFoco);
    this.intervalo = setInterval(() => this.muestrear(), Math.round(1000 / EntradaService.HZ));
  }

  detener(): void {
    window.removeEventListener('keydown', this.alPresionar);
    window.removeEventListener('keyup', this.alSoltar);
    window.removeEventListener('mousemove', this.alMover);
    window.removeEventListener('mousedown', this.alPresionarMouse);
    window.removeEventListener('mouseup', this.alSoltarMouse);
    window.removeEventListener('blur', this.alPerderFoco);
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
    this.limpiar();
  }

  /** Reinicia la secuencia. Se llama al (re)conectar: sec vuelve a arrancar en 1 (§5.1). */
  reiniciarSecuencia(): void {
    this.sec = 0;
  }

  /** Encola USAR_BOTIQUIN (para el click del quick-slot del HUD, ademas de la tecla Q). */
  usarBotiquin(): void {
    this.accionesPendientes.push('USAR_BOTIQUIN');
  }

  private muestrear(): void {
    if (this.emisor === null) {
      return;
    }
    this.sec++;
    this.emisor(this.componerInput());
  }

  private componerInput(): Input {
    const acciones = this.accionesPendientes;
    this.accionesPendientes = [];
    return {
      v: VERSION_PROTOCOLO,
      tipo: 'INPUT',
      sec: this.sec,
      mover: this.vectorMovimiento(),
      apuntar: this.anguloApuntado(),
      disparar: this.disparando,
      acciones,
    };
  }

  private vectorMovimiento(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.teclas.has('w')) {
      y -= 1;
    }
    if (this.teclas.has('s')) {
      y += 1;
    }
    if (this.teclas.has('a')) {
      x -= 1;
    }
    if (this.teclas.has('d')) {
      x += 1;
    }
    return { x, y };
  }

  private anguloApuntado(): number {
    if (this.canvas === null) {
      return 0;
    }
    const rect = this.canvas.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    return Math.atan2(this.mouseY - centroY, this.mouseX - centroX);
  }

  private limpiar(): void {
    this.teclas.clear();
    this.disparando = false;
    this.accionesPendientes = [];
  }
}
