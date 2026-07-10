import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Mapa } from '../../models/mapa';
import { MensajeServidor, VERSION_PROTOCOLO } from '../../models/protocolo';
import { ConexionPartidaService } from './conexion-partida.service';
import { EntradaService } from './entrada.service';
import { EstadoPartidaStore } from './estado-partida.store';
import { HudComponent } from './hud.component';
import { MapaService } from './mapa.service';
import { OverlayEstadoComponent } from './overlay-estado.component';
import { RendererIsometrico } from './render/renderer-isometrico';
import { RendererJuego } from './render/renderer-juego';
import { RendererTopDown2D } from './render/renderer-top-down-2d';
import { RendererTresD } from './render/tres/renderer-tres-d';
import { TicketService } from './ticket.service';

type ModoRenderer = 'top-down' | 'isometrico' | '3d';

const MODOS_RENDERER: readonly ModoRenderer[] = ['top-down', 'isometrico', '3d'];

const CLAVE_RENDERER = 'zc.renderer';

/**
 * Raiz de composicion del feature de partida (PLAN §7-B/§7-C). Es el UNICO punto que conecta las
 * piezas: conexion (WS), entrada (30 Hz), store (interpolacion) y renderer (dibujo). Cada pieza sigue
 * sin conocer a las otras; el componente las orquesta.
 *
 * <p>Flujo: inicia el renderer -> se suscribe al stream tipado -> al abrir el socket reinicia la
 * secuencia y envia UNIRSE -> arranca el sampler de entrada -> corre un rAF que pide el estado
 * interpolado al store y se lo pasa al renderer.
 *
 * <p>Fase 8 (Bridge): la implementacion del renderer se elige aca (localStorage) y se puede
 * alternar EN CALIENTE con el boton 2D/ISO — se destruye una, se inicia la otra sobre el mismo
 * canvas y se le re-fija el mapa cacheado. Store, conexion y entrada no se enteran.
 */
@Component({
  selector: 'app-partida',
  standalone: true,
  imports: [HudComponent, OverlayEstadoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor">
      <canvas #lienzo class="lienzo"></canvas>
      @if (modoRenderer() === '3d') {
        <div class="mira" aria-hidden="true"></div>
        @if (!entrada.capturaActiva()) {
          <button type="button" class="aviso-captura" (click)="entrada.solicitarCaptura()">
            CLICK PARA CAPTURAR EL MOUSE
          </button>
        }
      }
      <app-hud />
      <app-overlay-estado />
      <div class="pie">
        <span class="estado" [class.estado--ok]="estadoConexion() === 'conectado'">
          {{ estadoConexion() }}
        </span>
        <span class="pista">
          {{ modoRenderer() === '3d' ? 'mouse girar · W avanzar · click disparar' : 'WASD moverte · mouse apuntar · click disparar' }}
        </span>
        <button
          type="button"
          class="alternar-vista"
          (click)="alternarRenderer()"
          [disabled]="cambiandoRenderer()"
        >
          VISTA: {{ etiquetaModo() }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .contenedor {
        position: fixed;
        inset: 0;
        overflow: hidden;
      }
      .lienzo {
        display: block;
        width: 100%;
        height: 100%;
      }
      .pie {
        position: absolute;
        bottom: 12px;
        left: 12px;
        display: flex;
        gap: 10px;
        align-items: center;
        font-weight: 700;
      }
      .estado,
      .pista {
        border: 3px solid var(--color-thick-border);
        border-radius: 10px;
        padding: 4px 10px;
        background: rgba(15, 26, 54, 0.85);
        color: #eaf0ff;
        text-transform: uppercase;
        font-size: 13px;
      }
      .estado--ok {
        color: var(--color-health-lime);
      }
      .alternar-vista {
        border: 3px solid var(--color-thick-border);
        border-radius: 10px;
        padding: 4px 10px;
        background: var(--grad-play-button);
        color: #111424;
        text-transform: uppercase;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }
      .alternar-vista:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .mira {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6px;
        height: 6px;
        margin: -3px 0 0 -3px;
        border-radius: 50%;
        background: #eaf0ff;
        border: 2px solid var(--color-thick-border);
        pointer-events: none;
      }
      .aviso-captura {
        position: absolute;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 3px solid var(--color-thick-border);
        border-radius: 10px;
        padding: 10px 18px;
        background: rgba(15, 26, 54, 0.9);
        color: #eaf0ff;
        text-transform: uppercase;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
        pointer-events: auto;
      }
      .aviso-captura:hover {
        background: rgba(30, 45, 80, 0.95);
      }
    `,
  ],
})
export class PartidaComponent implements AfterViewInit, OnDestroy {
  private readonly conexion = inject(ConexionPartidaService);
  protected readonly entrada = inject(EntradaService);
  private readonly store = inject(EstadoPartidaStore);
  private readonly mapaService = inject(MapaService);
  private readonly ticketService = inject(TicketService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  /** El nodo real en uso: tras el primer swap de renderer ya NO es el que devuelve `lienzo()` (B1, Decision #2). */
  private lienzoActual!: HTMLCanvasElement;
  private renderer: RendererJuego;
  private mapaActual: Mapa | null = null;
  private readonly suscripciones: Subscription[] = [];
  private rafId = 0;
  private idPartida = '';

  readonly estadoConexion = this.conexion.estado;
  readonly modoRenderer = signal<ModoRenderer>(this.leerModoGuardado());
  readonly cambiandoRenderer = signal(false);

  constructor() {
    this.renderer = this.crearRenderer(this.modoRenderer());
  }

  async ngAfterViewInit(): Promise<void> {
    const idPartida = this.route.snapshot.queryParamMap.get('idPartida');
    if (idPartida === null) {
      this.router.navigate(['/lobby']);
      return;
    }
    this.idPartida = idPartida;

    this.lienzoActual = this.lienzo().nativeElement;
    await this.renderer.iniciar(this.lienzoActual);
    if (this.modoRenderer() === '3d') {
      // Sin gesto de usuario en la carga inicial: no se pide pointer lock, el aviso de captura invita al click.
      this.entrada.configurarModo('tercera-persona', this.lienzoActual, false);
    }

    this.suscripciones.push(
      this.conexion.mensajes$.subscribe((mensaje) => this.despachar(mensaje)),
      this.conexion.abierto$.subscribe(() => this.alAbrirConexion()),
    );

    this.conexion.conectar();
    this.entrada.iniciar(this.lienzoActual, (input) => {
      this.conexion.enviar(input);
      this.store.aplicarInputLocal(input); // prediccion inmediata del movimiento propio (F7)
    });
    this.bucleRender();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.entrada.detener();
    this.conexion.desconectar();
    this.renderer.destruir();
    this.suscripciones.forEach((suscripcion) => suscripcion.unsubscribe());
    // El store es root: sin esto, resultadoFinal/FINALIZADA sobreviven al salir y la PROXIMA
    // partida arrancaria mostrando el podio viejo (y el guard dejaria salir sin confirmar).
    this.store.reiniciar();
  }

  /** Pide el ticket recien al abrir el socket (TTL 30s, R1): pedirlo antes arriesga que venza. */
  private alAbrirConexion(): void {
    this.entrada.reiniciarSecuencia();
    this.suscripciones.push(
      this.ticketService.solicitar(this.idPartida).subscribe({
        next: (ticket) =>
          this.conexion.enviar({ v: VERSION_PROTOCOLO, tipo: 'UNIRSE', ticket }),
        error: () => this.conexion.desconectar(),
      }),
    );
  }

  private despachar(mensaje: MensajeServidor): void {
    switch (mensaje.tipo) {
      case 'BIENVENIDA':
        this.store.aplicarBienvenida(mensaje);
        this.cargarMapa(mensaje.idMapa);
        break;
      case 'SNAPSHOT':
        this.store.aplicarSnapshot(mensaje);
        break;
      case 'EVENTO':
        this.store.aplicarEvento(mensaje);
        if (mensaje.evento === 'FIN_PARTIDA') {
          this.conexion.dejarDeReconectar(); // la partida murio: reconectar seria un ciclo infinito
        }
        break;
    }
  }

  private cargarMapa(idMapa: string): void {
    this.suscripciones.push(
      this.mapaService.obtener(idMapa).subscribe((mapa) => {
        this.mapaActual = mapa; // cacheado para re-fijarlo al alternar de renderer (F8)
        this.renderer.establecerMapa(mapa);
        this.store.establecerMapa(mapa); // la prediccion (F7) necesita los obstaculos para colisionar
      }),
    );
  }

  /**
   * Cicla 2D -> ISO -> 3D -> 2D EN CALIENTE (F8/fase 3D, la prueba del Bridge con 3 proyecciones):
   * destruye el renderer actual, RECREA el nodo `<canvas>` (Decision #2 — Pixi deja el contexto
   * webgl2 pegado al nodo tras `destroy()`; compartirlo con Three es comportamiento no especificado),
   * inicia el nuevo sobre el canvas fresco y le re-fija el mapa cacheado. El rAF sigue corriendo
   * (renderizar() de un renderer sin iniciar es un no-op seguro); store/conexion, intactos.
   */
  async alternarRenderer(): Promise<void> {
    if (this.cambiandoRenderer()) {
      return;
    }
    this.cambiandoRenderer.set(true);
    const indiceActual = MODOS_RENDERER.indexOf(this.modoRenderer());
    const nuevoModo = MODOS_RENDERER[(indiceActual + 1) % MODOS_RENDERER.length];

    this.renderer.destruir();
    const canvas = this.recrearLienzo();
    // Sincrono y ANTES del await siguiente: el pointer lock del modo 3D necesita el gesto de este click.
    this.entrada.configurarModo(nuevoModo === '3d' ? 'tercera-persona' : 'plano', canvas);

    const nuevoRenderer = this.crearRenderer(nuevoModo);
    await nuevoRenderer.iniciar(canvas);
    if (this.mapaActual !== null) {
      nuevoRenderer.establecerMapa(this.mapaActual);
    }
    this.renderer = nuevoRenderer;
    this.modoRenderer.set(nuevoModo);
    localStorage.setItem(CLAVE_RENDERER, nuevoModo);
    this.cambiandoRenderer.set(false);
  }

  /** Reemplaza el nodo `<canvas>` por uno nuevo (mismo padre, misma clase): contexto WebGL siempre virgen. */
  private recrearLienzo(): HTMLCanvasElement {
    const viejo = this.lienzoActual;
    const nuevo = document.createElement('canvas');
    nuevo.className = viejo.className;
    viejo.replaceWith(nuevo);
    this.lienzoActual = nuevo;
    return nuevo;
  }

  protected etiquetaModo(): string {
    switch (this.modoRenderer()) {
      case 'top-down':
        return '2D';
      case 'isometrico':
        return 'ISO';
      case '3d':
        return '3D';
    }
  }

  private crearRenderer(modo: ModoRenderer): RendererJuego {
    switch (modo) {
      case 'isometrico':
        return new RendererIsometrico();
      case '3d':
        return new RendererTresD();
      case 'top-down':
        return new RendererTopDown2D();
    }
  }

  private leerModoGuardado(): ModoRenderer {
    const guardado = localStorage.getItem(CLAVE_RENDERER);
    return MODOS_RENDERER.includes(guardado as ModoRenderer) ? (guardado as ModoRenderer) : 'top-down';
  }

  private readonly bucleRender = (): void => {
    const estado = this.store.estadoVisual(performance.now());
    if (estado !== null) {
      this.renderer.renderizar(estado, this.store.idJugador());
    }
    this.rafId = requestAnimationFrame(this.bucleRender);
  };
}
