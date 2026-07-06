import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MensajeServidor, VERSION_PROTOCOLO } from '../../models/protocolo';
import { ConexionPartidaService } from './conexion-partida.service';
import { EntradaService } from './entrada.service';
import { EstadoPartidaStore } from './estado-partida.store';
import { MapaService } from './mapa.service';
import { RendererJuego } from './render/renderer-juego';
import { RendererTopDown2D } from './render/renderer-top-down-2d';

/**
 * Raiz de composicion del feature de partida (PLAN §7-B/§7-C). Es el UNICO punto que conecta las
 * piezas: conexion (WS), entrada (30 Hz), store (interpolacion) y renderer (dibujo). Cada pieza sigue
 * sin conocer a las otras; el componente las orquesta.
 *
 * <p>Flujo: inicia el renderer -> se suscribe al stream tipado -> al abrir el socket reinicia la
 * secuencia y envia UNIRSE -> arranca el sampler de entrada -> corre un rAF que pide el estado
 * interpolado al store y se lo pasa al renderer.
 */
@Component({
  selector: 'app-partida',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor">
      <canvas #lienzo class="lienzo"></canvas>
      <div class="hud">
        <span class="estado" [class.estado--ok]="estadoConexion() === 'conectado'">
          {{ estadoConexion() }}
        </span>
        @if (hpPropio() !== null) {
          <span class="hp">HP {{ hpPropio() }}</span>
        }
        <span class="pista">WASD para moverte · mouse para apuntar</span>
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
      .hud {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        gap: 10px;
        align-items: center;
        font-weight: 700;
      }
      .estado,
      .hp,
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
      .hp {
        color: var(--color-health-lime);
      }
    `,
  ],
})
export class PartidaComponent implements AfterViewInit, OnDestroy {
  private readonly conexion = inject(ConexionPartidaService);
  private readonly entrada = inject(EntradaService);
  private readonly store = inject(EstadoPartidaStore);
  private readonly mapaService = inject(MapaService);

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly renderer: RendererJuego = new RendererTopDown2D();
  private readonly suscripciones: Subscription[] = [];
  private rafId = 0;

  readonly estadoConexion = this.conexion.estado;
  readonly hpPropio = computed(() => {
    const snapshot = this.store.ultimoSnapshot();
    const idPropio = this.store.idJugador();
    if (snapshot === null || idPropio === null) {
      return null;
    }
    const jugador = snapshot.jugadores.find((candidato) => candidato.id === idPropio);
    return jugador ? jugador.hp : null;
  });

  async ngAfterViewInit(): Promise<void> {
    const canvas = this.lienzo().nativeElement;
    await this.renderer.iniciar(canvas);

    this.suscripciones.push(
      this.conexion.mensajes$.subscribe((mensaje) => this.despachar(mensaje)),
      this.conexion.abierto$.subscribe(() => this.alAbrirConexion()),
    );

    this.conexion.conectar();
    this.entrada.iniciar(canvas, (input) => this.conexion.enviar(input));
    this.bucleRender();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.entrada.detener();
    this.conexion.desconectar();
    this.renderer.destruir();
    this.suscripciones.forEach((suscripcion) => suscripcion.unsubscribe());
  }

  private alAbrirConexion(): void {
    this.entrada.reiniciarSecuencia();
    this.conexion.enviar({ v: VERSION_PROTOCOLO, tipo: 'UNIRSE', ticket: null });
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
    }
  }

  private cargarMapa(idMapa: string): void {
    this.suscripciones.push(
      this.mapaService.obtener(idMapa).subscribe((mapa) => this.renderer.establecerMapa(mapa)),
    );
  }

  private readonly bucleRender = (): void => {
    const estado = this.store.estadoVisual(performance.now());
    if (estado !== null) {
      this.renderer.renderizar(estado, this.store.idJugador());
    }
    this.rafId = requestAnimationFrame(this.bucleRender);
  };
}
