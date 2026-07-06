import { Application, Graphics } from 'pixi.js';
import { DecoracionMapa, Mapa, RectanguloMapa } from '../../../models/mapa';
import { EstadoVisual, JugadorVisual } from '../estado-visual';
import { RendererJuego } from './renderer-juego';

/**
 * Renderer 2D top-down con PixiJS (WebGL), la implementacion principal del MVP (PLAN §2.5).
 *
 * <p>Fase 1: dibuja el mapa (cesped, decoracion sin colision como el rio, y obstaculos como cajas con
 * contorno negro grueso — estilo "Battle Bash", R35) y sobre el los jugadores. La camara se centra en
 * el jugador propio; solo se dibuja lo que cae en el viewport (culling). El sprite art definitivo y el
 * HUD completo llegan en fases siguientes SIN tocar la interfaz {@link RendererJuego}.
 */
export class RendererTopDown2D implements RendererJuego {
  private static readonly ESCALA = 24; // pixeles por unidad de mundo
  private static readonly RADIO_PX = 14;
  private static readonly LARGO_MIRA_PX = 34;
  private static readonly GROSOR_BORDE = 3;

  private static readonly COLOR_VOID = 0x0f1a36; // fuera del mapa
  private static readonly COLOR_CESPED = 0x82c341; // --color-bg-map
  private static readonly COLOR_OBSTACULO = 0xb5834a; // caja de madera
  private static readonly COLOR_RIO = 0x3aa7d8;
  private static readonly COLOR_BORDE = 0x111424; // --color-thick-border
  private static readonly COLOR_PROPIO = 0x4ade80; // --color-health-lime
  private static readonly COLOR_OTRO = 0xff6b9d;

  private app: Application | null = null;
  private mapa: Mapa | null = null;
  private readonly graficos = new Graphics();

  async iniciar(canvas: HTMLCanvasElement): Promise<void> {
    const app = new Application();
    await app.init({
      canvas,
      background: RendererTopDown2D.COLOR_VOID,
      resizeTo: canvas.parentElement ?? window,
      antialias: true,
    });
    app.ticker.stop(); // el render lo dispara el rAF del componente
    app.stage.addChild(this.graficos);
    this.app = app;
  }

  establecerMapa(mapa: Mapa): void {
    this.mapa = mapa;
  }

  renderizar(estado: EstadoVisual, idJugadorPropio: string | null): void {
    if (this.app === null) {
      return;
    }
    const anchoPantalla = this.app.renderer.width;
    const altoPantalla = this.app.renderer.height;
    const centroX = anchoPantalla / 2;
    const centroY = altoPantalla / 2;
    const camara = this.posicionCamara(estado, idJugadorPropio);

    this.graficos.clear();
    this.dibujarMapa(camara, centroX, centroY, anchoPantalla, altoPantalla);
    for (const jugador of estado.jugadores) {
      const x = (jugador.x - camara.x) * RendererTopDown2D.ESCALA + centroX;
      const y = (jugador.y - camara.y) * RendererTopDown2D.ESCALA + centroY;
      this.dibujarJugador(x, y, jugador, jugador.id === idJugadorPropio);
    }
    this.app.render();
  }

  redimensionar(ancho: number, alto: number): void {
    this.app?.renderer.resize(ancho, alto);
  }

  destruir(): void {
    if (this.app !== null) {
      this.app.destroy(false, { children: true });
      this.app = null;
    }
  }

  private dibujarMapa(
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
    anchoPantalla: number,
    altoPantalla: number,
  ): void {
    if (this.mapa === null) {
      return;
    }
    const escala = RendererTopDown2D.ESCALA;

    // Cesped: todo el area jugable del mapa, con borde grueso para ver los limites.
    const fondoX = (0 - camara.x) * escala + centroX;
    const fondoY = (0 - camara.y) * escala + centroY;
    this.graficos
      .rect(fondoX, fondoY, this.mapa.ancho * escala, this.mapa.alto * escala)
      .fill(RendererTopDown2D.COLOR_CESPED)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });

    // Decoracion (sin colision): se dibuja debajo de los obstaculos.
    for (const decoracion of this.mapa.decoraciones) {
      this.dibujarRectangulo(decoracion, camara, centroX, centroY, anchoPantalla, altoPantalla,
        this.colorDecoracion(decoracion), false);
    }
    // Obstaculos: cajas con contorno.
    for (const obstaculo of this.mapa.obstaculos) {
      this.dibujarRectangulo(obstaculo, camara, centroX, centroY, anchoPantalla, altoPantalla,
        RendererTopDown2D.COLOR_OBSTACULO, true);
    }
  }

  private dibujarRectangulo(
    rectangulo: RectanguloMapa,
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
    anchoPantalla: number,
    altoPantalla: number,
    color: number,
    conBorde: boolean,
  ): void {
    const escala = RendererTopDown2D.ESCALA;
    const sx = (rectangulo.x - camara.x) * escala + centroX;
    const sy = (rectangulo.y - camara.y) * escala + centroY;
    const sancho = rectangulo.ancho * escala;
    const salto = rectangulo.alto * escala;
    if (!this.enPantalla(sx, sy, sancho, salto, anchoPantalla, altoPantalla)) {
      return; // culling
    }
    const dibujo = this.graficos.rect(sx, sy, sancho, salto).fill(color);
    if (conBorde) {
      dibujo.stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    }
  }

  private dibujarJugador(x: number, y: number, jugador: JugadorVisual, propio: boolean): void {
    const finX = x + Math.cos(jugador.angulo) * RendererTopDown2D.LARGO_MIRA_PX;
    const finY = y + Math.sin(jugador.angulo) * RendererTopDown2D.LARGO_MIRA_PX;
    this.graficos
      .moveTo(x, y)
      .lineTo(finX, finY)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    this.graficos
      .circle(x, y, RendererTopDown2D.RADIO_PX)
      .fill(propio ? RendererTopDown2D.COLOR_PROPIO : RendererTopDown2D.COLOR_OTRO)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
  }

  private colorDecoracion(decoracion: DecoracionMapa): number {
    return decoracion.tipo === 'RIO' ? RendererTopDown2D.COLOR_RIO : RendererTopDown2D.COLOR_CESPED;
  }

  private enPantalla(
    sx: number,
    sy: number,
    sancho: number,
    salto: number,
    anchoPantalla: number,
    altoPantalla: number,
  ): boolean {
    return sx + sancho >= 0 && sx <= anchoPantalla && sy + salto >= 0 && sy <= altoPantalla;
  }

  private posicionCamara(estado: EstadoVisual, idJugadorPropio: string | null): { x: number; y: number } {
    const propio = estado.jugadores.find((jugador) => jugador.id === idJugadorPropio);
    if (propio !== undefined) {
      return { x: propio.x, y: propio.y };
    }
    if (estado.jugadores.length > 0) {
      return { x: estado.jugadores[0].x, y: estado.jugadores[0].y };
    }
    return { x: 0, y: 0 };
  }
}
