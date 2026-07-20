import { Injectable, signal } from '@angular/core';
import { AccionJugador, Input, VERSION_PROTOCOLO } from '../../models/protocolo';

/** 'plano' (2D/ISO, comportamiento historico) | 'tercera-persona' (3D, pointer lock — B4). */
export type ModoEntrada = 'plano' | 'tercera-persona';

@Injectable({ providedIn: 'root' })
export class EntradaService {
  private static readonly HZ = 30;
  private static readonly SENSIBILIDAD_YAW = 0.003;

  private readonly teclas = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private disparando = false;
  private sec = 0;
  private accionesPendientes: AccionJugador[] = [];
  private listenerSalto: (() => void) | null = null;

  private canvas: HTMLCanvasElement | null = null;
  private emisor: ((input: Input) => void) | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  private modo: ModoEntrada = 'plano';
  private yaw = 0;
  private canvasConListenerClick: HTMLCanvasElement | null = null;
  readonly capturaActiva = signal(false);

  private readonly alPresionar = (e: KeyboardEvent) => {
    const tecla = e.key.toLowerCase();
    const code = e.code.toLowerCase();
    this.teclas.add(tecla);
    this.teclas.add(code);
    if (e.shiftKey) {
      this.teclas.add('shift');
    }

    if (e.repeat) {
      return;
    }
    if (tecla === 'e') {
      this.accionesPendientes.push('RECOGER');
    } else if (tecla === 'q') {
      this.accionesPendientes.push('USAR_BOTIQUIN');
    } else if (tecla === ' ' || code === 'space') {
      this.dispararSalto();
    }
  };

  private readonly alSoltar = (e: KeyboardEvent) => {
    this.teclas.delete(e.key.toLowerCase());
    this.teclas.delete(e.code.toLowerCase());
    if (!e.shiftKey) {
      this.teclas.delete('shift');
    }
  };

  private readonly alMover = (e: MouseEvent) => {
    if (this.modo === 'tercera-persona') {
      if (this.capturaActiva()) {
        this.yaw = this.normalizarAngulo(this.yaw + e.movementX * EntradaService.SENSIBILIDAD_YAW);
      }
      return;
    }
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  private readonly alCambiarPointerLock = () => {
    this.capturaActiva.set(document.pointerLockElement === this.canvas);
  };
  private readonly alFallarPointerLock = () => {
    this.capturaActiva.set(false);
  };
  private readonly alClickParaRecapturar = () => {
    if (this.modo === 'tercera-persona' && document.pointerLockElement !== this.canvas) {
      this.pedirPointerLock();
    }
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
    if (this.modo === 'tercera-persona') {
      this.salirDePointerLock();
    }
    this.modo = 'plano';
    this.limpiar();
  }

  onSalto(callback: () => void): void {
    this.listenerSalto = callback;
  }

  private dispararSalto(): void {
    if (this.listenerSalto !== null) {
      this.listenerSalto();
    }
  }

  reiniciarSecuencia(): void {
    this.sec = 0;
  }

  configurarModo(modo: ModoEntrada, canvas: HTMLCanvasElement, pedirCaptura = true): void {
    const entrandoATerceraPersona = modo === 'tercera-persona' && this.modo !== 'tercera-persona';
    const saliendoDeTerceraPersona = modo !== 'tercera-persona' && this.modo === 'tercera-persona';

    if (entrandoATerceraPersona) {
      this.yaw = Math.atan2(this.mouseY - window.innerHeight / 2, this.mouseX - window.innerWidth / 2);
    }
    if (saliendoDeTerceraPersona) {
      this.salirDePointerLock();
    }

    this.canvas = canvas;
    this.modo = modo;

    if (entrandoATerceraPersona) {
      document.addEventListener('pointerlockchange', this.alCambiarPointerLock);
      document.addEventListener('pointerlockerror', this.alFallarPointerLock);
      canvas.addEventListener('click', this.alClickParaRecapturar);
      this.canvasConListenerClick = canvas;
      if (pedirCaptura) {
        this.pedirPointerLock();
      }
    }
  }

  private salirDePointerLock(): void {
    document.removeEventListener('pointerlockchange', this.alCambiarPointerLock);
    document.removeEventListener('pointerlockerror', this.alFallarPointerLock);
    this.canvasConListenerClick?.removeEventListener('click', this.alClickParaRecapturar);
    this.canvasConListenerClick = null;
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
    this.capturaActiva.set(false);
  }

  solicitarCaptura(): void {
    if (this.modo === 'tercera-persona') {
      this.pedirPointerLock();
    }
  }

  private pedirPointerLock(): void {
    if (this.canvas === null) {
      return;
    }
    try {
      const resultado = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (resultado instanceof Promise) {
        resultado.catch((error: unknown) => {
          console.warn('[ZonaCero] pointer lock con unadjustedMovement rechazado, reintentando sin opciones:', error);
          this.pedirPointerLockSinOpciones();
        });
      }
    } catch (error) {
      console.warn('[ZonaCero] pointer lock con unadjustedMovement tiro excepcion sincronica, reintentando sin opciones:', error);
      this.pedirPointerLockSinOpciones();
    }
  }

  private pedirPointerLockSinOpciones(): void {
    try {
      const resultado = this.canvas?.requestPointerLock();
      if (resultado instanceof Promise) {
        resultado.catch((error: unknown) => {
          console.warn('[ZonaCero] pointer lock rechazado (sin opciones):', error);
        });
      }
    } catch (error) {
      console.warn('[ZonaCero] pointer lock tiro excepcion sincronica (sin opciones):', error);
    }
  }

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
    const local = this.vectorMovimientoLocal();
    if (this.modo !== 'tercera-persona') {
      return local;
    }
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    return {
      x: cosYaw * -local.y - sinYaw * local.x,
      y: sinYaw * -local.y + cosYaw * local.x,
    };
  }

  private vectorMovimientoLocal(): { x: number; y: number } {
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

    // SPRINT CON TECLA SHIFT (1.8x)
    const esSprint = this.teclas.has('shift') || this.teclas.has('shiftleft') || this.teclas.has('shiftright');
    const factorSprint = esSprint ? 1.8 : 1.0;

    return { x: x * factorSprint, y: y * factorSprint };
  }

  private anguloApuntado(): number {
    if (this.modo === 'tercera-persona') {
      return this.yaw;
    }
    if (this.canvas === null) {
      return 0;
    }
    const rect = this.canvas.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    return Math.atan2(this.mouseY - centroY, this.mouseX - centroX);
  }

  private normalizarAngulo(angulo: number): number {
    let normalizado = angulo;
    while (normalizado > Math.PI) {
      normalizado -= Math.PI * 2;
    }
    while (normalizado < -Math.PI) {
      normalizado += Math.PI * 2;
    }
    return normalizado;
  }

  private limpiar(): void {
    this.teclas.clear();
    this.disparando = false;
    this.accionesPendientes = [];
  }
}
