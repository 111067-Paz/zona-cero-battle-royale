import { Injectable, signal } from '@angular/core';
import { AccionJugador, Input, VERSION_PROTOCOLO } from '../../models/protocolo';

/** 'plano' (2D/ISO, comportamiento historico) | 'tercera-persona' (3D, pointer lock — B4). */
export type ModoEntrada = 'plano' | 'tercera-persona';

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
  /** Radianes de yaw por pixel de `movementX` bajo pointer lock (B4). */
  private static readonly SENSIBILIDAD_YAW = 0.003;

  private readonly teclas = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private disparando = false;
  private sec = 0;
  private accionesPendientes: AccionJugador[] = [];

  private canvas: HTMLCanvasElement | null = null;
  private emisor: ((input: Input) => void) | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  private modo: ModoEntrada = 'plano';
  /** Yaw acumulado en modo 3D (radianes): reemplaza al atan2-al-centro del modo plano. */
  private yaw = 0;
  /** Canvas donde esta enganchado el listener de click-para-recapturar (B4) — puede no ser `this.canvas` en medio de un swap. */
  private canvasConListenerClick: HTMLCanvasElement | null = null;
  /** Si el pointer lock del modo 3D esta activo ahora mismo (B4). El template la usa para el aviso de captura. */
  readonly capturaActiva = signal(false);

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
    if (this.modo === 'tercera-persona') {
      if (this.capturaActiva()) {
        this.yaw = this.normalizarAngulo(this.yaw + e.movementX * EntradaService.SENSIBILIDAD_YAW);
      }
      return; // sin lock no hay deltas fiables: el yaw se queda quieto, no se lee mouseX/mouseY en 3D
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
  /** Reintenta el lock al clickear el canvas (p.ej. tras Esc) — click valido como gesto de usuario. */
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

  /** Reinicia la secuencia. Se llama al (re)conectar: sec vuelve a arrancar en 1 (§5.1). */
  reiniciarSecuencia(): void {
    this.sec = 0;
  }

  /**
   * Cambia de modo de entrada y actualiza el canvas de referencia — imprescindible en cada swap de
   * renderer porque `partida.component` RECREA el nodo `<canvas>` (B1, Decision #2).
   *
   * <p>Al ENTRAR a 'tercera-persona': siembra `yaw` con el `anguloApuntado()` de modo plano (para no
   * pegar un giro visible) y registra los listeners de pointer lock. `pedirCaptura` decide si ademas
   * se pide el lock ya mismo — `true` (default) para el click del boton VISTA, que SI es gesto de
   * usuario valido; `false` para la carga inicial en 3D (sin gesto): el aviso de captura invita al
   * click. Al SALIR de 'tercera-persona': libera el lock y los listeners.
   */
  configurarModo(modo: ModoEntrada, canvas: HTMLCanvasElement, pedirCaptura = true): void {
    const entrandoATerceraPersona = modo === 'tercera-persona' && this.modo !== 'tercera-persona';
    const saliendoDeTerceraPersona = modo !== 'tercera-persona' && this.modo === 'tercera-persona';

    if (entrandoATerceraPersona) {
      // Semilla con la posicion actual del mouse relativa al VIEWPORT, no al rect del canvas: para
      // este punto `partida.component.recrearLienzo()` YA desconecto el canvas viejo del DOM (un
      // nodo detached devuelve getBoundingClientRect() en ceros), y el canvas nuevo aun no esta en
      // `this.canvas`. El canvas siempre ocupa el viewport completo (`.contenedor{inset:0}`), asi
      // que usar el centro de la ventana es equivalente y evita depender de cualquiera de los dos nodos.
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

  /** Suelta el lock (si es nuestro) y desengancha los listeners de pointer lock — deja todo como si nunca hubiera entrado a 3D. */
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

  /**
   * Punto de entrada PUBLICO para pedir el lock desde un gesto de usuario explicito (el boton
   * "CLICK PARA CAPTURAR EL MOUSE" del overlay, ademas del click-en-el-canvas de siempre). Un
   * `<button>` real es un gesto de activacion mas confiable para el navegador que un listener de
   * `click` sobre el canvas detras de un overlay.
   */
  solicitarCaptura(): void {
    if (this.modo === 'tercera-persona') {
      this.pedirPointerLock();
    }
  }

  /**
   * `unadjustedMovement` da deltas crudos (mejor sensacion de apuntado); no todos los navegadores lo
   * soportan de la misma forma — algunos RECHAZAN la promesa, otros directamente TIRAN la excepcion
   * de forma sincronica en vez de devolver una promesa rota. Por eso el `try/catch` envuelve la
   * llamada entera, no solo el `.catch()` de la promesa: sin el try/catch, un rechazo sincronico
   * aborta `pedirPointerLock()` en silencio y el mouse queda libre para siempre (el bug real: el
   * cursor sigue visible/moviendose en 3D porque el lock nunca llega a pedirse sin opciones).
   * Tras Esc, Chromium impone ademas un cooldown breve: el catch/segundo intento fallido queda
   * silencioso, `alClickParaRecapturar` ya se encarga de reintentar en el proximo click.
   *
   * <p>Los `console.warn` son deliberados y temporales: el navegador NUNCA explica por que
   * rechaza un pointer lock salvo por esta razon/mensaje — sin loguearla, un fallo persistente es
   * indiagnosticable a distancia.
   */
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

  /**
   * En modo plano, `mover` es absoluto a mundo (WASD tal cual). En 'tercera-persona' se compone
   * IGUAL en local y se rota por `yaw` (fwd=(cos yaw,sin yaw), der=(-sin yaw,cos yaw)) antes de
   * emitir: magnitud identica, asi que la prediccion/reconciliacion (que simulan con este mismo
   * vector) no se enteran del cambio — W siempre avanza hacia donde mira la camara.
   */
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
    return { x, y };
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
