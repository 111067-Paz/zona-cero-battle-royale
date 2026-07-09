import { Application, Graphics, Text } from 'pixi.js';
import { DecoracionMapa, Mapa, RectanguloMapa } from '../../../models/mapa';
import { BotinVisual, EstadoVisual, JugadorVisual, NumeroDanio, ProyectilVisual, ZonaVisual } from '../estado-visual';
import { RendererJuego } from './renderer-juego';

interface PuntoPantalla {
  x: number;
  y: number;
}

/** Entidad lista para dibujar, con su profundidad de mundo para el painter's algorithm. */
interface Dibujable {
  profundidad: number;
  dibujar: () => void;
}

/**
 * Renderer isometrico 2:1 (Fase 8, PLAN §2.5/§11): la prueba del Bridge. Consume EXACTAMENTE el
 * mismo {@link EstadoVisual} que el top-down — solo cambia la PROYECCION y aparece lo que el
 * top-down no necesita: el depth sort. Cero cambios en simulacion, protocolo, conexion o estado.
 *
 * <p>Proyeccion lineal {@code sx=(x−y)·E, sy=(x+y)·E/2}: un circulo de mundo se convierte en una
 * elipse EXACTA de semiejes {@code r·E·√2} y {@code r·E·√2/2} (matematica, no aproximacion). Los
 * obstaculos se extruyen como prismas con altura placeholder (el mapa no tiene dato de altura,
 * R35) y todas las entidades se ordenan por profundidad {@code x+y} antes de dibujarse.
 */
export class RendererIsometrico implements RendererJuego {
  private static readonly ESCALA_X = 24; // pixeles por unidad de mundo en el eje isometrico horizontal
  private static readonly ESCALA_Y = 12; // 2:1 clasico: la mitad en vertical
  private static readonly RAIZ_2 = Math.SQRT2;
  private static readonly ALTURA_OBSTACULO_PX = 26;
  private static readonly ALTURA_CUERPO_PX = 10;
  private static readonly RADIO_PX = 14;
  private static readonly LARGO_MIRA_PX = 34;
  private static readonly GROSOR_BORDE = 3;
  private static readonly VIDA_MAX = 100;
  private static readonly MAX_TEXTOS_DANIO = 24;
  private static readonly DURACION_DANIO_MS = 600;
  private static readonly MARGEN_CULLING_PX = 120;

  private static readonly COLOR_VOID = 0x0f1a36;
  private static readonly COLOR_CESPED = 0x82c341;
  private static readonly COLOR_OBSTACULO = 0xb5834a;
  private static readonly COLOR_OBSTACULO_LADO_OSCURO = 0x8a5f33;
  private static readonly COLOR_OBSTACULO_LADO_CLARO = 0x9e7040;
  private static readonly COLOR_RIO = 0x3aa7d8;
  private static readonly COLOR_BORDE = 0x111424;
  private static readonly COLOR_PROPIO = 0x4ade80;
  private static readonly COLOR_OTRO = 0xff6b9d;
  private static readonly COLOR_MUERTO = 0x8a8f9c;
  private static readonly COLOR_SOMBRA = 0x111424;
  private static readonly COLOR_PROYECTIL = 0xffee44;
  private static readonly COLOR_ZONA_ACTUAL = 0x4ade80;
  private static readonly COLOR_ZONA_PROXIMA = 0xffcc00;
  private static readonly COLOR_BOTIQUIN = 0x4ade80;
  private static readonly COLOR_ARMA_BOTIN = 0xffcc00;

  private app: Application | null = null;
  private mapa: Mapa | null = null;
  private readonly graficos = new Graphics();
  private readonly textosDanio: Text[] = [];

  /** Camara del frame en curso (coordenadas de MUNDO), fijada al inicio de cada renderizar(). */
  private camaraX = 0;
  private camaraY = 0;
  private centroX = 0;
  private centroY = 0;

  async iniciar(canvas: HTMLCanvasElement): Promise<void> {
    const app = new Application();
    await app.init({
      canvas,
      background: RendererIsometrico.COLOR_VOID,
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
    this.centroX = this.app.renderer.width / 2;
    this.centroY = this.app.renderer.height / 2;
    const camara = this.posicionCamara(estado, idJugadorPropio);
    this.camaraX = camara.x;
    this.camaraY = camara.y;

    this.graficos.clear();
    this.dibujarSuelo();
    if (estado.zona !== null) {
      this.dibujarZona(estado.zona);
    }
    this.dibujarEntidadesOrdenadas(estado, idJugadorPropio);
    this.actualizarNumerosDanio(estado.numerosDanio);
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

  /** Mundo -> pantalla: proyeccion iso 2:1 relativa a la camara, centrada en el viewport. */
  private proyectar(x: number, y: number): PuntoPantalla {
    return {
      x: (x - y - (this.camaraX - this.camaraY)) * RendererIsometrico.ESCALA_X + this.centroX,
      y: (x + y - (this.camaraX + this.camaraY)) * RendererIsometrico.ESCALA_Y + this.centroY,
    };
  }

  /**
   * El corazon de la fase: TODO lo que ocupa volumen (obstaculos, jugadores, botines, proyectiles)
   * se junta con su profundidad de mundo (x+y; los obstaculos usan su esquina frontal) y se dibuja
   * de atras hacia adelante — el painter's algorithm que el top-down nunca necesito.
   */
  private dibujarEntidadesOrdenadas(estado: EstadoVisual, idJugadorPropio: string | null): void {
    const dibujables: Dibujable[] = [];
    if (this.mapa !== null) {
      for (const obstaculo of this.mapa.obstaculos) {
        dibujables.push({
          profundidad: obstaculo.x + obstaculo.ancho + obstaculo.y + obstaculo.alto,
          dibujar: () => this.dibujarPrisma(obstaculo),
        });
      }
    }
    for (const botin of estado.botines) {
      dibujables.push({ profundidad: botin.x + botin.y, dibujar: () => this.dibujarBotin(botin) });
    }
    for (const jugador of estado.jugadores) {
      dibujables.push({
        profundidad: jugador.x + jugador.y,
        dibujar: () => this.dibujarJugador(jugador, jugador.id === idJugadorPropio),
      });
    }
    for (const proyectil of estado.proyectiles) {
      dibujables.push({ profundidad: proyectil.x + proyectil.y, dibujar: () => this.dibujarProyectil(proyectil) });
    }
    dibujables.sort((a, b) => a.profundidad - b.profundidad);
    for (const dibujable of dibujables) {
      dibujable.dibujar();
    }
  }

  private dibujarSuelo(): void {
    if (this.mapa === null) {
      return;
    }
    this.dibujarRomboPlano(
      { x: 0, y: 0, ancho: this.mapa.ancho, alto: this.mapa.alto },
      RendererIsometrico.COLOR_CESPED,
      true,
    );
    for (const decoracion of this.mapa.decoraciones) {
      this.dibujarRomboPlano(decoracion, this.colorDecoracion(decoracion), false);
    }
  }

  /** Rectangulo de mundo proyectado como rombo a nivel del suelo (sin volumen: decoracion, piso). */
  private dibujarRomboPlano(rectangulo: RectanguloMapa, color: number, conBorde: boolean): void {
    const [a, b, c, d] = this.esquinasProyectadas(rectangulo);
    if (!this.bboxEnPantalla([a, b, c, d])) {
      return;
    }
    const dibujo = this.graficos.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill(color);
    if (conBorde) {
      dibujo.stroke({ width: RendererIsometrico.GROSOR_BORDE, color: RendererIsometrico.COLOR_BORDE });
    }
  }

  /**
   * Obstaculo como prisma extruido: rombo superior elevado + las DOS caras visibles desde esta
   * proyeccion (la sur y la este, adyacentes a la esquina frontal), cada una con su propio tono
   * para el relieve del estilo Battle Bash.
   */
  private dibujarPrisma(obstaculo: RectanguloMapa): void {
    const [a, b, c, d] = this.esquinasProyectadas(obstaculo);
    if (!this.bboxEnPantalla([a, b, c, d])) {
      return;
    }
    const h = RendererIsometrico.ALTURA_OBSTACULO_PX;
    const at = { x: a.x, y: a.y - h };
    const bt = { x: b.x, y: b.y - h };
    const ct = { x: c.x, y: c.y - h };
    const dt = { x: d.x, y: d.y - h };
    const borde = { width: RendererIsometrico.GROSOR_BORDE, color: RendererIsometrico.COLOR_BORDE };

    // Cara sur (D-C, la de mayor y de mundo) y cara este (B-C, la de mayor x de mundo).
    this.graficos
      .poly([d.x, d.y, c.x, c.y, ct.x, ct.y, dt.x, dt.y])
      .fill(RendererIsometrico.COLOR_OBSTACULO_LADO_OSCURO)
      .stroke(borde);
    this.graficos
      .poly([b.x, b.y, c.x, c.y, ct.x, ct.y, bt.x, bt.y])
      .fill(RendererIsometrico.COLOR_OBSTACULO_LADO_CLARO)
      .stroke(borde);
    this.graficos
      .poly([at.x, at.y, bt.x, bt.y, ct.x, ct.y, dt.x, dt.y])
      .fill(RendererIsometrico.COLOR_OBSTACULO)
      .stroke(borde);
  }

  private dibujarJugador(jugador: JugadorVisual, propio: boolean): void {
    const base = this.proyectar(jugador.x, jugador.y);
    if (!this.enPantalla(base)) {
      return;
    }
    const muerto = jugador.estadoVida === 'MUERTO';
    // Sombra elíptica a nivel del suelo: ancla al personaje con el piso.
    this.graficos
      .ellipse(base.x, base.y, RendererIsometrico.RADIO_PX, RendererIsometrico.RADIO_PX / 2)
      .fill({ color: RendererIsometrico.COLOR_SOMBRA, alpha: 0.35 });

    const cuerpoY = base.y - RendererIsometrico.ALTURA_CUERPO_PX;
    if (!muerto) {
      const mira = this.direccionProyectada(jugador.angulo, RendererIsometrico.LARGO_MIRA_PX);
      this.graficos
        .moveTo(base.x, cuerpoY)
        .lineTo(base.x + mira.x, cuerpoY + mira.y)
        .stroke({ width: RendererIsometrico.GROSOR_BORDE, color: RendererIsometrico.COLOR_BORDE });
    }
    const color = muerto
      ? RendererIsometrico.COLOR_MUERTO
      : propio
        ? RendererIsometrico.COLOR_PROPIO
        : RendererIsometrico.COLOR_OTRO;
    this.graficos
      .circle(base.x, cuerpoY, RendererIsometrico.RADIO_PX)
      .fill(color)
      .stroke({ width: RendererIsometrico.GROSOR_BORDE, color: RendererIsometrico.COLOR_BORDE });
    if (!muerto) {
      this.dibujarBarraHp(base.x, cuerpoY, jugador.hp);
    }
  }

  private dibujarBarraHp(x: number, y: number, hp: number): void {
    const ancho = 32;
    const alto = 5;
    const bx = x - ancho / 2;
    const by = y - RendererIsometrico.RADIO_PX - 10;
    const fraccion = Math.max(0, Math.min(1, hp / RendererIsometrico.VIDA_MAX));
    this.graficos.rect(bx, by, ancho, alto).fill(RendererIsometrico.COLOR_BORDE);
    if (fraccion > 0) {
      this.graficos.rect(bx, by, ancho * fraccion, alto).fill(this.colorHp(fraccion));
    }
  }

  /**
   * Anillos de zona actual y proxima: un circulo de mundo bajo sx=(x−y)E, sy=(x+y)E/2 es la elipse
   * axis-aligned de semiejes r·E·√2 (horizontal) y r·E·√2/2 (vertical) — sale de la parametrizacion,
   * no de un ajuste a ojo.
   */
  private dibujarZona(zona: ZonaVisual): void {
    const centro = this.proyectar(zona.cx, zona.cy);
    const factor = RendererIsometrico.ESCALA_X * RendererIsometrico.RAIZ_2;
    const rxProxima = zona.radioProximo * factor;
    this.graficos
      .ellipse(centro.x, centro.y, rxProxima, rxProxima / 2)
      .stroke({ width: 2, color: RendererIsometrico.COLOR_ZONA_PROXIMA, alpha: 0.6 });
    const rxActual = zona.radio * factor;
    this.graficos
      .ellipse(centro.x, centro.y, rxActual, rxActual / 2)
      .stroke({ width: RendererIsometrico.GROSOR_BORDE, color: RendererIsometrico.COLOR_ZONA_ACTUAL });
  }

  private dibujarBotin(botin: BotinVisual): void {
    const punto = this.proyectar(botin.x, botin.y);
    if (!this.enPantalla(punto)) {
      return;
    }
    const color = botin.tipo === 'BOTIQUIN' ? RendererIsometrico.COLOR_BOTIQUIN : RendererIsometrico.COLOR_ARMA_BOTIN;
    this.graficos
      .ellipse(punto.x, punto.y, 8, 4)
      .fill({ color: RendererIsometrico.COLOR_SOMBRA, alpha: 0.35 });
    this.graficos
      .circle(punto.x, punto.y - 5, 8)
      .fill(color)
      .stroke({ width: 2, color: RendererIsometrico.COLOR_BORDE });
  }

  private dibujarProyectil(proyectil: ProyectilVisual): void {
    const punto = this.proyectar(proyectil.x, proyectil.y);
    if (!this.enPantalla(punto)) {
      return;
    }
    const py = punto.y - RendererIsometrico.ALTURA_CUERPO_PX; // vuela a la altura del cuerpo
    const cola = this.direccionProyectada(proyectil.angulo, 10);
    this.graficos
      .moveTo(punto.x - cola.x, py - cola.y)
      .lineTo(punto.x, py)
      .stroke({ width: 3, color: RendererIsometrico.COLOR_PROYECTIL });
    this.graficos
      .circle(punto.x, py, 4)
      .fill(RendererIsometrico.COLOR_PROYECTIL)
      .stroke({ width: 2, color: RendererIsometrico.COLOR_BORDE });
  }

  private actualizarNumerosDanio(numeros: NumeroDanio[]): void {
    const ahora = performance.now();
    for (let i = 0; i < this.textosDanio.length; i++) {
      const texto = this.textosDanio[i];
      const numero = i < numeros.length ? numeros[i] : null;
      if (numero === null) {
        texto.visible = false;
        continue;
      }
      const edad = ahora - numero.creadoEn;
      if (edad > RendererIsometrico.DURACION_DANIO_MS) {
        texto.visible = false;
        continue;
      }
      const punto = this.proyectar(numero.x, numero.y);
      texto.text = String(numero.cantidad);
      texto.x = punto.x;
      texto.y = punto.y - RendererIsometrico.ALTURA_CUERPO_PX - 24 - edad * 0.03;
      texto.alpha = 1 - edad / RendererIsometrico.DURACION_DANIO_MS;
      texto.visible = true;
    }
  }

  private crearTextosDanio(app: Application): void {
    for (let i = 0; i < RendererIsometrico.MAX_TEXTOS_DANIO; i++) {
      const texto = new Text({
        text: '',
        style: {
          fill: 0xffffff,
          fontSize: 18,
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 'bold',
          stroke: { color: RendererIsometrico.COLOR_BORDE, width: 4 },
        },
      });
      texto.anchor.set(0.5);
      texto.visible = false;
      app.stage.addChild(texto);
      this.textosDanio.push(texto);
    }
  }

  /** Direccion de mundo (angulo) proyectada a pantalla, normalizada y escalada a largoPx. */
  private direccionProyectada(angulo: number, largoPx: number): PuntoPantalla {
    const dx = (Math.cos(angulo) - Math.sin(angulo)) * RendererIsometrico.ESCALA_X;
    const dy = (Math.cos(angulo) + Math.sin(angulo)) * RendererIsometrico.ESCALA_Y;
    const largo = Math.hypot(dx, dy);
    if (largo === 0) {
      return { x: 0, y: 0 };
    }
    return { x: (dx / largo) * largoPx, y: (dy / largo) * largoPx };
  }

  /** Esquinas del rectangulo de mundo en orden A(x,y), B(x+w,y), C(x+w,y+h), D(x,y+h), proyectadas. */
  private esquinasProyectadas(rectangulo: RectanguloMapa): [PuntoPantalla, PuntoPantalla, PuntoPantalla, PuntoPantalla] {
    return [
      this.proyectar(rectangulo.x, rectangulo.y),
      this.proyectar(rectangulo.x + rectangulo.ancho, rectangulo.y),
      this.proyectar(rectangulo.x + rectangulo.ancho, rectangulo.y + rectangulo.alto),
      this.proyectar(rectangulo.x, rectangulo.y + rectangulo.alto),
    ];
  }

  private colorHp(fraccion: number): number {
    if (fraccion > 0.5) {
      return RendererIsometrico.COLOR_PROPIO;
    }
    if (fraccion > 0.25) {
      return 0xffcc00;
    }
    return 0xff4444;
  }

  private colorDecoracion(decoracion: DecoracionMapa): number {
    return decoracion.tipo === 'RIO' ? RendererIsometrico.COLOR_RIO : RendererIsometrico.COLOR_CESPED;
  }

  private enPantalla(punto: PuntoPantalla): boolean {
    if (this.app === null) {
      return false;
    }
    const margen = RendererIsometrico.MARGEN_CULLING_PX;
    return punto.x >= -margen && punto.x <= this.app.renderer.width + margen
      && punto.y >= -margen && punto.y <= this.app.renderer.height + margen;
  }

  /**
   * Solapamiento del bounding box proyectado contra el viewport: un poligono grande (el suelo
   * completo) puede cubrir la pantalla con TODAS sus esquinas afuera — chequear esquinas sueltas
   * lo haria desaparecer parado en el medio del mapa.
   */
  private bboxEnPantalla(puntos: PuntoPantalla[]): boolean {
    if (this.app === null) {
      return false;
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const punto of puntos) {
      minX = Math.min(minX, punto.x);
      minY = Math.min(minY, punto.y);
      maxX = Math.max(maxX, punto.x);
      maxY = Math.max(maxY, punto.y);
    }
    const margen = RendererIsometrico.MARGEN_CULLING_PX;
    return maxX >= -margen && minX <= this.app.renderer.width + margen
      && maxY >= -margen && minY - RendererIsometrico.ALTURA_OBSTACULO_PX <= this.app.renderer.height + margen;
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
