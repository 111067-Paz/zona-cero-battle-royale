import { Application, Graphics, Text } from 'pixi.js';
import { DecoracionMapa, Mapa, RectanguloMapa } from '../../../models/mapa';
import { EstadoVisual, JugadorVisual, NumeroDanio, ProyectilVisual } from '../estado-visual';
import { RendererJuego } from './renderer-juego';

/**
 * Renderer 2D top-down con PixiJS (WebGL), la implementacion principal del MVP (PLAN §2.5).
 *
 * <p>Fase 2: sobre el mapa dibuja proyectiles, barras de HP sobre los jugadores, los muertos en gris,
 * y los numeros de dano flotantes con fade (R29). Todo con contorno negro grueso (estilo "Battle
 * Bash", R35). La camara se centra en el jugador propio y solo se dibuja lo que cae en el viewport.
 *
 * <p>Controla el render manualmente ({@code app.render()} desde el rAF del componente, ticker
 * detenido): un unico bucle de dibujo.
 */
export class RendererTopDown2D implements RendererJuego {
  private static readonly ESCALA = 24; // pixeles por unidad de mundo
  private static readonly RADIO_PX = 14;
  private static readonly LARGO_MIRA_PX = 34;
  private static readonly GROSOR_BORDE = 3;
  private static readonly VIDA_MAX = 100;
  private static readonly MAX_TEXTOS_DANIO = 24;
  private static readonly DURACION_DANIO_MS = 600;

  private static readonly COLOR_VOID = 0x0f1a36;
  private static readonly COLOR_CESPED = 0x82c341;
  private static readonly COLOR_OBSTACULO = 0xb5834a;
  private static readonly COLOR_RIO = 0x3aa7d8;
  private static readonly COLOR_BORDE = 0x111424;
  private static readonly COLOR_PROPIO = 0x4ade80;
  private static readonly COLOR_OTRO = 0xff6b9d;
  private static readonly COLOR_MUERTO = 0x8a8f9c;
  private static readonly COLOR_PROYECTIL = 0xffee44;

  private app: Application | null = null;
  private mapa: Mapa | null = null;
  private readonly graficos = new Graphics();
  private readonly textosDanio: Text[] = [];

  async iniciar(canvas: HTMLCanvasElement): Promise<void> {
    const app = new Application();
    await app.init({
      canvas,
      background: RendererTopDown2D.COLOR_VOID,
      resizeTo: canvas.parentElement ?? window,
      antialias: true,
    });
    app.ticker.stop();
    app.stage.addChild(this.graficos);
    this.crearTextosDanio(app);
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
    for (const proyectil of estado.proyectiles) {
      this.dibujarProyectil(proyectil, camara, centroX, centroY, anchoPantalla, altoPantalla);
    }
    this.actualizarNumerosDanio(estado.numerosDanio, camara, centroX, centroY);
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

  private crearTextosDanio(app: Application): void {
    for (let i = 0; i < RendererTopDown2D.MAX_TEXTOS_DANIO; i++) {
      const texto = new Text({
        text: '',
        style: {
          fill: 0xffffff,
          fontSize: 18,
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 'bold',
          stroke: { color: RendererTopDown2D.COLOR_BORDE, width: 4 },
        },
      });
      texto.anchor.set(0.5);
      texto.visible = false;
      app.stage.addChild(texto);
      this.textosDanio.push(texto);
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
    const fondoX = (0 - camara.x) * escala + centroX;
    const fondoY = (0 - camara.y) * escala + centroY;
    this.graficos
      .rect(fondoX, fondoY, this.mapa.ancho * escala, this.mapa.alto * escala)
      .fill(RendererTopDown2D.COLOR_CESPED)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });

    for (const decoracion of this.mapa.decoraciones) {
      this.dibujarRectangulo(decoracion, camara, centroX, centroY, anchoPantalla, altoPantalla,
        this.colorDecoracion(decoracion), false);
    }
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
      return;
    }
    const dibujo = this.graficos.rect(sx, sy, sancho, salto).fill(color);
    if (conBorde) {
      dibujo.stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    }
  }

  private dibujarJugador(x: number, y: number, jugador: JugadorVisual, propio: boolean): void {
    const muerto = jugador.estadoVida === 'MUERTO';
    if (!muerto) {
      const finX = x + Math.cos(jugador.angulo) * RendererTopDown2D.LARGO_MIRA_PX;
      const finY = y + Math.sin(jugador.angulo) * RendererTopDown2D.LARGO_MIRA_PX;
      this.graficos
        .moveTo(x, y)
        .lineTo(finX, finY)
        .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    }
    const color = muerto
      ? RendererTopDown2D.COLOR_MUERTO
      : propio
        ? RendererTopDown2D.COLOR_PROPIO
        : RendererTopDown2D.COLOR_OTRO;
    this.graficos
      .circle(x, y, RendererTopDown2D.RADIO_PX)
      .fill(color)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    if (!muerto) {
      this.dibujarBarraHp(x, y, jugador.hp);
    }
  }

  private dibujarBarraHp(x: number, y: number, hp: number): void {
    const ancho = 32;
    const alto = 5;
    const bx = x - ancho / 2;
    const by = y - RendererTopDown2D.RADIO_PX - 10;
    const fraccion = Math.max(0, Math.min(1, hp / RendererTopDown2D.VIDA_MAX));
    this.graficos
      .rect(bx, by, ancho, alto)
      .fill(RendererTopDown2D.COLOR_BORDE);
    if (fraccion > 0) {
      this.graficos.rect(bx, by, ancho * fraccion, alto).fill(this.colorHp(fraccion));
    }
  }

  private dibujarProyectil(
    proyectil: ProyectilVisual,
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
    anchoPantalla: number,
    altoPantalla: number,
  ): void {
    const px = (proyectil.x - camara.x) * RendererTopDown2D.ESCALA + centroX;
    const py = (proyectil.y - camara.y) * RendererTopDown2D.ESCALA + centroY;
    if (!this.enPantalla(px - 6, py - 6, 12, 12, anchoPantalla, altoPantalla)) {
      return;
    }
    const colaX = px - Math.cos(proyectil.angulo) * 10;
    const colaY = py - Math.sin(proyectil.angulo) * 10;
    this.graficos
      .moveTo(colaX, colaY)
      .lineTo(px, py)
      .stroke({ width: 3, color: RendererTopDown2D.COLOR_PROYECTIL });
    this.graficos
      .circle(px, py, 4)
      .fill(RendererTopDown2D.COLOR_PROYECTIL)
      .stroke({ width: 2, color: RendererTopDown2D.COLOR_BORDE });
  }

  private actualizarNumerosDanio(
    numeros: NumeroDanio[],
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
  ): void {
    const ahora = performance.now();
    for (let i = 0; i < this.textosDanio.length; i++) {
      const texto = this.textosDanio[i];
      const numero = i < numeros.length ? numeros[i] : null;
      if (numero === null) {
        texto.visible = false;
        continue;
      }
      const edad = ahora - numero.creadoEn;
      if (edad > RendererTopDown2D.DURACION_DANIO_MS) {
        texto.visible = false;
        continue;
      }
      texto.text = String(numero.cantidad);
      texto.x = (numero.x - camara.x) * RendererTopDown2D.ESCALA + centroX;
      texto.y = (numero.y - camara.y) * RendererTopDown2D.ESCALA + centroY - 24 - edad * 0.03;
      texto.alpha = 1 - edad / RendererTopDown2D.DURACION_DANIO_MS;
      texto.visible = true;
    }
  }

  private colorHp(fraccion: number): number {
    if (fraccion > 0.5) {
      return RendererTopDown2D.COLOR_PROPIO;
    }
    if (fraccion > 0.25) {
      return 0xffcc00;
    }
    return 0xff4444;
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
