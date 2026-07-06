import { Application, Graphics } from 'pixi.js';
import { EstadoVisual, JugadorVisual } from '../estado-visual';
import { RendererJuego } from './renderer-juego';

/**
 * Renderer 2D top-down con PixiJS (WebGL), la implementacion principal del MVP (PLAN §2.5).
 *
 * <p>Fase 0: dibuja cada jugador como un circulo con contorno negro grueso (primer ladrillo del
 * estilo "Battle Bash", R35) y una linea de apuntado. La camara se centra en el jugador propio, que
 * queda siempre en el centro de pantalla. El mapa, sprites y HUD llegan en fases siguientes SIN tocar
 * esta interfaz.
 *
 * <p>Controla el render manualmente ({@code app.render()} desde el rAF del componente, con el ticker
 * detenido): un unico bucle de dibujo, sin competir con el ticker interno de Pixi.
 */
export class RendererTopDown2D implements RendererJuego {
  private static readonly ESCALA = 24; // pixeles por unidad de mundo
  private static readonly RADIO_PX = 14;
  private static readonly LARGO_MIRA_PX = 34;
  private static readonly GROSOR_BORDE = 3;

  private static readonly COLOR_FONDO = 0x82c341; // --color-bg-map
  private static readonly COLOR_BORDE = 0x111424; // --color-thick-border
  private static readonly COLOR_PROPIO = 0x4ade80; // --color-health-lime
  private static readonly COLOR_OTRO = 0xff6b9d;

  private app: Application | null = null;
  private readonly graficos = new Graphics();

  async iniciar(canvas: HTMLCanvasElement): Promise<void> {
    const app = new Application();
    await app.init({
      canvas,
      background: RendererTopDown2D.COLOR_FONDO,
      resizeTo: canvas.parentElement ?? window,
      antialias: true,
    });
    app.ticker.stop(); // el render lo dispara el rAF del componente
    app.stage.addChild(this.graficos);
    this.app = app;
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
