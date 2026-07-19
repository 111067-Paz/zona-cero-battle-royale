import { Application, Graphics, Text } from 'pixi.js';
import { DecoracionMapa, Mapa, RectanguloMapa } from '../../../models/mapa';
import { BotinVisual, EstadoVisual, JugadorVisual, NumeroDanio, ProyectilVisual, ZonaVisual } from '../estado-visual';
import { dibujarChibi } from './dibujo-chibi';
import {
  COLOR_ARBUSTO,
  COLOR_ARBUSTO_CLARO,
  COLOR_CAMINO,
  COLOR_CAMINO_BORDE,
  COLOR_CESPED_CLARO,
  COLOR_CESPED_OSCURO,
  COLOR_FLOR_CENTRO,
  COLOR_FLOR_PETALO,
  COLOR_LAGO,
  COLOR_LAGO_CLARO,
  COLOR_RIO,
  COLOR_RIO_CLARO,
  especificacionObstaculo,
  EspecificacionObstaculo,
  faseAgua,
  lerpColor,
  semillaDeterministica,
} from './paleta-mapa';
import { RendererJuego } from './renderer-juego';

interface RectanguloPantalla {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface ParcheCesped {
  x: number;
  y: number;
  radio: number;
  claro: boolean;
}

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
  private static readonly COLOR_BORDE = 0x111424;
  private static readonly COLOR_PROPIO = 0x4ade80;
  private static readonly COLOR_PROYECTIL = 0xffee44;
  private static readonly COLOR_ZONA_ACTUAL = 0x4ade80;
  private static readonly COLOR_ZONA_PROXIMA = 0xffcc00;
  private static readonly COLOR_BOTIQUIN = 0x4ade80;
  private static readonly COLOR_ARMA_BOTIN = 0xffcc00;
  private static readonly CANTIDAD_PARCHES_CESPED = 48;

  private app: Application | null = null;
  private mapa: Mapa | null = null;
  private parchesCesped: ParcheCesped[] = [];
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
    this.parchesCesped = this.generarParchesCesped(mapa);
  }

  /** Parches de pasto deterministas (sin Math.random): rompen el verde plano con textura, siempre iguales para el mismo mapa. */
  private generarParchesCesped(mapa: Mapa): ParcheCesped[] {
    const parches: ParcheCesped[] = [];
    for (let i = 0; i < RendererTopDown2D.CANTIDAD_PARCHES_CESPED; i++) {
      const tx = semillaDeterministica(i * 3.7, 11.3);
      const ty = semillaDeterministica(i * 1.9, 7.1);
      const tr = semillaDeterministica(i * 5.3, 2.6);
      parches.push({
        x: tx * mapa.ancho,
        y: ty * mapa.alto,
        radio: 2 + tr * 4,
        claro: semillaDeterministica(i * 2.2, 9.4) > 0.5,
      });
    }
    return parches;
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
    if (estado.zona !== null) {
      this.dibujarZona(estado.zona, camara, centroX, centroY);
    }
    for (const botin of estado.botines) {
      this.dibujarBotin(botin, camara, centroX, centroY, anchoPantalla, altoPantalla);
    }
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

    for (const parche of this.parchesCesped) {
      const px = (parche.x - camara.x) * escala + centroX;
      const py = (parche.y - camara.y) * escala + centroY;
      const pr = parche.radio * escala;
      if (!this.enPantalla(px - pr, py - pr, pr * 2, pr * 2, anchoPantalla, altoPantalla)) {
        continue;
      }
      this.graficos.ellipse(px, py, pr, pr * 0.7).fill(parche.claro ? COLOR_CESPED_CLARO : COLOR_CESPED_OSCURO);
    }

    const ahoraMs = performance.now();
    for (const decoracion of this.mapa.decoraciones) {
      this.dibujarDecoracion(decoracion, camara, centroX, centroY, anchoPantalla, altoPantalla, ahoraMs);
    }
    for (const obstaculo of this.mapa.obstaculos) {
      this.dibujarObstaculo(obstaculo, camara, centroX, centroY, anchoPantalla, altoPantalla);
    }
  }

  private rectanguloPantalla(
    rectangulo: RectanguloMapa | DecoracionMapa,
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
  ): RectanguloPantalla {
    const escala = RendererTopDown2D.ESCALA;
    return {
      x: (rectangulo.x - camara.x) * escala + centroX,
      y: (rectangulo.y - camara.y) * escala + centroY,
      ancho: rectangulo.ancho * escala,
      alto: rectangulo.alto * escala,
    };
  }

  private dibujarDecoracion(
    decoracion: DecoracionMapa,
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
    anchoPantalla: number,
    altoPantalla: number,
    ahoraMs: number,
  ): void {
    const rect = this.rectanguloPantalla(decoracion, camara, centroX, centroY);
    if (!this.enPantalla(rect.x, rect.y, rect.ancho, rect.alto, anchoPantalla, altoPantalla)) {
      return;
    }
    switch (decoracion.tipo) {
      case 'RIO':
        this.graficos.rect(rect.x, rect.y, rect.ancho, rect.alto).fill(this.colorAgua(COLOR_RIO, COLOR_RIO_CLARO, ahoraMs));
        return;
      case 'LAGO':
        this.graficos.rect(rect.x, rect.y, rect.ancho, rect.alto).fill(this.colorAgua(COLOR_LAGO, COLOR_LAGO_CLARO, ahoraMs));
        return;
      case 'CAMINO':
        this.dibujarCamino(rect, decoracion);
        return;
      case 'FLOR':
        this.dibujarFlores(decoracion, rect);
        return;
      case 'ARBUSTO':
        this.dibujarArbusto(rect);
        return;
      default:
        this.graficos.rect(rect.x, rect.y, rect.ancho, rect.alto).fill(RendererTopDown2D.COLOR_CESPED);
    }
  }

  private dibujarCamino(rect: RectanguloPantalla, decoracion: DecoracionMapa): void {
    const radio = Math.min(rect.ancho, rect.alto) * 0.35;
    this.graficos
      .roundRect(rect.x, rect.y, rect.ancho, rect.alto, radio)
      .fill(COLOR_CAMINO)
      .stroke({ width: 2, color: COLOR_CAMINO_BORDE });
    const cantidadPiedras = 4;
    for (let i = 0; i < cantidadPiedras; i++) {
      const tx = semillaDeterministica(decoracion.x + i * 6.1, decoracion.y + i * 2.3);
      const ty = semillaDeterministica(decoracion.y + i * 4.7, decoracion.x + i * 8.9);
      this.graficos.circle(rect.x + tx * rect.ancho, rect.y + ty * rect.alto, 1.5).fill(COLOR_CAMINO_BORDE);
    }
  }

  /** Arbusto: 3 circulos solapados con highlights, posicion determinista para no repetir el mismo dibujo. */
  private dibujarArbusto(rect: RectanguloPantalla): void {
    const cx = rect.x + rect.ancho / 2;
    const cy = rect.y + rect.alto / 2;
    const radio = Math.min(rect.ancho, rect.alto) / 2;
    const centros = [
      { x: cx, y: cy, r: radio },
      { x: cx - radio * 0.6, y: cy + radio * 0.25, r: radio * 0.7 },
      { x: cx + radio * 0.6, y: cy + radio * 0.25, r: radio * 0.7 },
    ];
    for (const bola of centros) {
      this.graficos
        .circle(bola.x, bola.y, bola.r)
        .fill(COLOR_ARBUSTO)
        .stroke({ width: 2, color: RendererTopDown2D.COLOR_BORDE });
    }
    this.graficos.circle(cx - radio * 0.25, cy - radio * 0.25, radio * 0.25).fill(COLOR_ARBUSTO_CLARO);
  }

  /** Flores deterministicas (sin Math.random): mismas coordenadas -> mismas flores, siempre. */
  private dibujarFlores(decoracion: DecoracionMapa, rect: RectanguloPantalla): void {
    const cantidad = 3;
    for (let i = 0; i < cantidad; i++) {
      const tx = semillaDeterministica(decoracion.x + i * 7.3, decoracion.y + i * 3.1);
      const ty = semillaDeterministica(decoracion.y + i * 11.7, decoracion.x + i * 5.9);
      const px = rect.x + tx * rect.ancho;
      const py = rect.y + ty * rect.alto;
      this.graficos.circle(px, py, 2.5).fill(COLOR_FLOR_PETALO);
      this.graficos.circle(px, py, 1).fill(COLOR_FLOR_CENTRO);
    }
  }

  /** Color del agua "respirando" entre dos tonos con el reloj — animado sin estado propio. */
  private colorAgua(base: number, claro: number, ahoraMs: number): number {
    const t = (Math.sin(faseAgua(ahoraMs) * Math.PI * 2) + 1) / 2;
    return lerpColor(base, claro, t);
  }

  private dibujarObstaculo(
    obstaculo: RectanguloMapa,
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
    anchoPantalla: number,
    altoPantalla: number,
  ): void {
    const rect = this.rectanguloPantalla(obstaculo, camara, centroX, centroY);
    if (!this.enPantalla(rect.x, rect.y, rect.ancho, rect.alto, anchoPantalla, altoPantalla)) {
      return;
    }
    const especificacion = especificacionObstaculo(obstaculo.tipo);
    switch (obstaculo.tipo) {
      case 'CAJA':
        this.dibujarCaja(rect, especificacion);
        return;
      case 'ARBOL':
        this.dibujarArbol(rect, especificacion);
        return;
      case 'ROCA':
        this.dibujarRoca(rect, especificacion);
        return;
      case 'CARPA':
        this.dibujarCarpa(rect, especificacion);
        return;
      default: {
        const exhaustivo: never = obstaculo.tipo;
        throw new Error(`Tipo de obstaculo sin dibujo: ${exhaustivo}`);
      }
    }
  }

  private dibujarCaja(rect: RectanguloPantalla, especificacion: EspecificacionObstaculo): void {
    const bordeNegro = { width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE };
    
    // 1. Cuerpo del cajón con colorPrincipal y borde grueso
    this.graficos
      .rect(rect.x, rect.y, rect.ancho, rect.alto)
      .fill(especificacion.colorPrincipal)
      .stroke(bordeNegro);

    // 2. Trazar 2 líneas horizontales divisorias (para formar 3 tablones de madera) con contorno negro
    const hTercio = rect.alto / 3;
    this.graficos
      .moveTo(rect.x, rect.y + hTercio)
      .lineTo(rect.x + rect.ancho, rect.y + hTercio)
      .stroke({ width: 2.5, color: RendererTopDown2D.COLOR_BORDE });
    this.graficos
      .moveTo(rect.x, rect.y + hTercio * 2)
      .lineTo(rect.x + rect.ancho, rect.y + hTercio * 2)
      .stroke({ width: 2.5, color: RendererTopDown2D.COLOR_BORDE });

    // 3. Dibujar la diagonal cruzada (refuerzo) con colorSecundario y borde negro
    const inset = 4;
    this.graficos
      .moveTo(rect.x + inset, rect.y + rect.alto - inset)
      .lineTo(rect.x + rect.ancho - inset, rect.y + inset)
      // Primero dibujamos la silueta negra del refuerzo
      .stroke({ width: Math.max(6, rect.ancho * 0.14), color: RendererTopDown2D.COLOR_BORDE });
      
    // Luego rellenamos con el colorSecundario en el centro para dar el efecto de tablón diagonal
    this.graficos
      .moveTo(rect.x + inset, rect.y + rect.alto - inset)
      .lineTo(rect.x + rect.ancho - inset, rect.y + inset)
      .stroke({ width: Math.max(3, rect.ancho * 0.08), color: especificacion.colorSecundario });
  }

  /** Arbol: sombra proyectada + copa en 3 capas (rim oscuro, principal, highlight) para dar volumen. */
  private dibujarArbol(rect: RectanguloPantalla, especificacion: EspecificacionObstaculo): void {
    const cx = rect.x + rect.ancho / 2;
    const cy = rect.y + rect.alto / 2;
    const radioCopa = Math.min(rect.ancho, rect.alto) / 2;
    const anchoTronco = rect.ancho * 0.25;

    this.graficos
      .ellipse(cx + 3, cy + rect.alto * 0.35, radioCopa * 0.8, radioCopa * 0.35)
      .fill({ color: 0x000000, alpha: 0.15 });

    this.graficos
      .rect(cx - anchoTronco / 2, cy, anchoTronco, rect.alto / 2)
      .fill(especificacion.colorSecundario)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });

    const colorRim = lerpColor(especificacion.colorPrincipal, 0x000000, 0.15);
    this.graficos
      .circle(cx, cy, radioCopa)
      .fill(colorRim)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    this.graficos.circle(cx, cy, radioCopa * 0.78).fill(especificacion.colorPrincipal);
    const colorHighlight = lerpColor(especificacion.colorPrincipal, 0xffffff, 0.28);
    this.graficos.circle(cx - radioCopa * 0.25, cy - radioCopa * 0.25, radioCopa * 0.42).fill(colorHighlight);
  }

  /** Roca facetada: poligono irregular determinista (7 vertices) + faceta clara + grietas. */
  private dibujarRoca(rect: RectanguloPantalla, especificacion: EspecificacionObstaculo): void {
    const cx = rect.x + rect.ancho / 2;
    const cy = rect.y + rect.alto / 2;
    const semiX = rect.ancho / 2;
    const semiY = rect.alto / 2;
    const vertices = 7;
    const puntos: number[] = [];
    for (let i = 0; i < vertices; i++) {
      const angulo = (i / vertices) * Math.PI * 2;
      const factor = 0.72 + 0.28 * semillaDeterministica(cx + i * 4.3, cy + i * 2.7);
      puntos.push(cx + Math.cos(angulo) * semiX * factor, cy + Math.sin(angulo) * semiY * factor);
    }
    this.graficos.poly(puntos).fill(especificacion.colorPrincipal).stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });

    const colorClaro = lerpColor(especificacion.colorPrincipal, 0xffffff, 0.18);
    this.graficos
      .poly([cx - semiX * 0.15, cy - semiY * 0.35, cx + semiX * 0.25, cy - semiY * 0.1, cx - semiX * 0.05, cy + semiY * 0.1])
      .fill(colorClaro);

    this.graficos
      .moveTo(cx - semiX * 0.3, cy - semiY * 0.2)
      .lineTo(cx + semiX * 0.1, cy + semiY * 0.3)
      .stroke({ width: 1.5, color: especificacion.colorSecundario });
    this.graficos
      .moveTo(cx + semiX * 0.2, cy - semiY * 0.3)
      .lineTo(cx + semiX * 0.35, cy)
      .stroke({ width: 1.5, color: especificacion.colorSecundario });
  }

  /** Carpa: triangulo + base + puerta oscura + franjas del apex a la base + banderin en la punta. */
  private dibujarCarpa(rect: RectanguloPantalla, especificacion: EspecificacionObstaculo): void {
    const apexX = rect.x + rect.ancho / 2;
    const apexY = rect.y;
    this.graficos
      .poly([apexX, apexY, rect.x, rect.y + rect.alto, rect.x + rect.ancho, rect.y + rect.alto])
      .fill(especificacion.colorPrincipal)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_BORDE });
    const alturaBase = rect.alto * 0.25;
    this.graficos.rect(rect.x, rect.y + rect.alto - alturaBase, rect.ancho, alturaBase).fill(especificacion.colorSecundario);

    const colorPuerta = lerpColor(especificacion.colorPrincipal, 0x000000, 0.45);
    const anchoPuerta = rect.ancho * 0.22;
    this.graficos
      .poly([apexX - anchoPuerta / 2, rect.y + rect.alto, apexX + anchoPuerta / 2, rect.y + rect.alto, apexX, rect.y + rect.alto * 0.4])
      .fill(colorPuerta);

    this.graficos
      .moveTo(apexX, apexY)
      .lineTo(rect.x + rect.ancho * 0.25, rect.y + rect.alto)
      .stroke({ width: 2, color: especificacion.colorSecundario });
    this.graficos
      .moveTo(apexX, apexY)
      .lineTo(rect.x + rect.ancho * 0.75, rect.y + rect.alto)
      .stroke({ width: 2, color: especificacion.colorSecundario });

    this.graficos.moveTo(apexX, apexY).lineTo(apexX, apexY - 8).stroke({ width: 2, color: RendererTopDown2D.COLOR_BORDE });
    this.graficos.poly([apexX, apexY - 8, apexX + 6, apexY - 6, apexX, apexY - 4]).fill(0xffcc00);
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
    dibujarChibi(this.graficos, x, y, RendererTopDown2D.RADIO_PX, jugador.personaje, { muerto, propio });
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

  /** Anillo de la zona actual (solido) y de la proxima contraccion (mas fino, aviso) — mismo centro. */
  private dibujarZona(zona: ZonaVisual, camara: { x: number; y: number }, centroX: number, centroY: number): void {
    const escala = RendererTopDown2D.ESCALA;
    const cx = (zona.cx - camara.x) * escala + centroX;
    const cy = (zona.cy - camara.y) * escala + centroY;
    this.graficos
      .circle(cx, cy, zona.radioProximo * escala)
      .stroke({ width: 2, color: RendererTopDown2D.COLOR_ZONA_PROXIMA, alpha: 0.6 });
    this.graficos
      .circle(cx, cy, zona.radio * escala)
      .stroke({ width: RendererTopDown2D.GROSOR_BORDE, color: RendererTopDown2D.COLOR_ZONA_ACTUAL });
  }

  private dibujarBotin(
    botin: BotinVisual,
    camara: { x: number; y: number },
    centroX: number,
    centroY: number,
    anchoPantalla: number,
    altoPantalla: number,
  ): void {
    const escala = RendererTopDown2D.ESCALA;
    const x = (botin.x - camara.x) * escala + centroX;
    const y = (botin.y - camara.y) * escala + centroY;
    if (!this.enPantalla(x - 8, y - 8, 16, 16, anchoPantalla, altoPantalla)) {
      return;
    }
    const color = botin.tipo === 'BOTIQUIN' ? RendererTopDown2D.COLOR_BOTIQUIN : RendererTopDown2D.COLOR_ARMA_BOTIN;
    this.graficos
      .circle(x, y, 8)
      .fill(color)
      .stroke({ width: 2, color: RendererTopDown2D.COLOR_BORDE });
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
