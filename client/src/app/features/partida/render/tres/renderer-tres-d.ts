import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Mapa } from '../../../../models/mapa';
import { BotinVisual, EstadoVisual, JugadorVisual, NumeroDanio, ProyectilVisual } from '../../estado-visual';
import { BotinPrefab } from './prefabs/botin-prefab';
import { faseAgua, lerpColor } from '../paleta-mapa';
import { RendererJuego } from '../renderer-juego';
import { ALTURA_CUERPO_CHIBI, ChibiRig, construirChibi, faseDesdeId, RADIO_CABEZA_CHIBI, RADIO_CUERPO_CHIBI } from './modelos-chibi-3d';
import { construirMundo3D, Mundo3D } from './mundo-3d';
import { aVector3, crearGradienteToon, crearSpriteCanvas, direccionDesdeAngulo, SpriteCanvas } from './utiles-3d';
import { construirZona3D, Zona3D } from './zona-3d';
import { AssetManager } from './managers/asset-manager';

const COLOR_CIELO = 0xbae6fd;
const COLOR_CESPED = 0x82c341;
const COLOR_ANILLO_PROPIO = 0xffcc00;
const COLOR_PROYECTIL = 0xffee44;
const COLOR_BOTIQUIN = 0x4ade80;
const COLOR_ARMA_BOTIN = 0xffcc00;

const ALTURA_CABEZA_CENTRO = RADIO_CUERPO_CHIBI * 1.7 + RADIO_CABEZA_CHIBI * 0.6;
const ALTURA_TOPE_CABEZA = ALTURA_CABEZA_CENTRO + RADIO_CABEZA_CHIBI;
const VIDA_MAX = 100;

const CANTIDAD_PROYECTILES_POOL = 64;
const RADIO_PROYECTIL = 0.12;

const CANTIDAD_TEXTOS_DANIO = 24;
const DURACION_DANIO_MS = 600;

/** Distancia recorrida por frame por encima de la cual el chibi se considera "en movimiento" (bobbing, B5). */
const UMBRAL_MOVIMIENTO_BOBBING = 0.004;

/** Offset de camara detras y arriba del jugador propio (Decision de arquitectura #6). */
const DISTANCIA_CAMARA = 5.5;
const ALTURA_CAMARA = 3.2;
const ALTURA_MIRA = 1.2;
const DISTANCIA_MIRA = 2.0;

interface EntidadJugador {
  rig: ChibiRig;
  anillo: Mesh;
  hp: SpriteCanvas;
  hpMostrado: number | null;
  muerto: boolean;
  posicionAnterior: { x: number; y: number } | null;
  alturaSalto: number;
  velocidadSalto: number;
  saltando: boolean;
}

interface TextoDanio {
  sprite: SpriteCanvas;
  textoActual: string | null;
}

/**
 * Renderer 3D en tercera persona (Three.js): tercer modo del Bridge, junto a `RendererTopDown2D` y
 * `RendererIsometrico`. Consume el MISMO `EstadoVisual` — solo cambia la proyeccion a una escena
 * 3D real con camara detras del jugador (B3). Este esqueleto (B1) deja escena/luces/niebla/suelo
 * placeholder/resize funcionando; `establecerMapa` y el diffing de entidades llegan en B2/B3.
 *
 * <p>`redimensionar()` es parte del contrato pero nadie lo invoca hoy (los renderers Pixi usan
 * `resizeTo` interno) — este renderer se autogestiona con un `ResizeObserver` sobre el contenedor
 * del canvas, igual de autonomo.
 */
export class RendererTresD implements RendererJuego {
  private static readonly FOV = 60;
  private static readonly CERCA = 0.1;
  private static readonly LEJOS = 200;
  private static readonly NIEBLA_CERCA = 70;
  private static readonly NIEBLA_LEJOS = 140;

  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private mapa: Mapa | null = null;

  private sueloPlaceholder: Mesh | null = null;
  private mundo: Mundo3D | null = null;
  private zona: Zona3D | null = null;

  private readonly jugadores = new Map<string, EntidadJugador>();
  private readonly botines = new Map<number, BotinPrefab>();
  private readonly proyectiles: Mesh[] = [];
  private readonly textosDanio: TextoDanio[] = [];
  private ultimaPoseCamara: { posicion: Vector3; mira: Vector3 } | null = null;

  private pitch = 0.6; // Ángulo vertical inicial (~34 grados)
  private alMoverMouse: ((e: MouseEvent) => void) | null = null;
  private alTeclaV: ((e: KeyboardEvent) => void) | null = null;
  private tipoCamara: 'tercera' | 'primera' = 'tercera';
  private idPropioActual: string | null = null;
  private ultimoFrameMs = performance.now();

  async iniciar(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    await AssetManager.getInstancia().precargarAssetsBasicos();

    const renderer = new WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new Scene();
    scene.background = new Color(COLOR_CIELO);
    scene.fog = new Fog(COLOR_CIELO, RendererTresD.NIEBLA_CERCA, RendererTresD.NIEBLA_LEJOS);

    const ancho = canvas.parentElement?.clientWidth ?? window.innerWidth;
    const alto = canvas.parentElement?.clientHeight ?? window.innerHeight;
    renderer.setSize(ancho, alto, false);
    const camera = new PerspectiveCamera(RendererTresD.FOV, ancho / Math.max(alto, 1), RendererTresD.CERCA, RendererTresD.LEJOS);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 0, 0);

    scene.add(new AmbientLight(0xe0f2fe, 0.45));
    scene.add(new HemisphereLight(0xbae6fd, 0x3f6212, 0.75));

    const direccional = new DirectionalLight(0xfff7ed, 1.4);
    direccional.position.set(-25, 45, 25);
    direccional.castShadow = true;
    direccional.shadow.mapSize.width = 2048;
    direccional.shadow.mapSize.height = 2048;
    direccional.shadow.camera.near = 0.5;
    direccional.shadow.camera.far = 150;
    direccional.shadow.camera.left = -60;
    direccional.shadow.camera.right = 60;
    direccional.shadow.camera.top = 60;
    direccional.shadow.camera.bottom = -60;
    direccional.shadow.bias = -0.0005;
    scene.add(direccional);

    // Suelo placeholder hasta que llegue establecerMapa() (el mapa baja por REST despues de BIENVENIDA).
    const suelo = new Mesh(
      new PlaneGeometry(256, 256),
      new MeshStandardMaterial({ color: COLOR_CESPED, roughness: 0.8, flatShading: true }),
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    scene.add(suelo);
    this.sueloPlaceholder = suelo;

    this.zona = construirZona3D();
    scene.add(this.zona.grupo);

    const materialProyectil = new MeshBasicMaterial({ color: COLOR_PROYECTIL });
    const geometriaProyectil = new SphereGeometry(RADIO_PROYECTIL, 6, 6);
    for (let i = 0; i < CANTIDAD_PROYECTILES_POOL; i++) {
      const proyectil = new Mesh(geometriaProyectil, materialProyectil);
      proyectil.visible = false;
      scene.add(proyectil);
      this.proyectiles.push(proyectil);
    }

    for (let i = 0; i < CANTIDAD_TEXTOS_DANIO; i++) {
      const sprite = crearSpriteCanvas(48, 24, { x: 0.6, y: 0.3 });
      sprite.sprite.visible = false;
      scene.add(sprite.sprite);
      this.textosDanio.push({ sprite, textoActual: null });
    }
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Escuchar movimiento vertical del mouse para control de cámara orbital completo (pitch)
    this.alMoverMouse = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        // Limitar pitch entre 0.1 (cerca del suelo) y 1.4 (casi cenital)
        this.pitch = Math.max(0.1, Math.min(1.4, this.pitch + e.movementY * 0.003));
      }
    };
    window.addEventListener('mousemove', this.alMoverMouse);

    // Alternar cámara con la tecla V (Tercera persona vs Primera persona)
    this.alTeclaV = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') {
        this.tipoCamara = this.tipoCamara === 'tercera' ? 'primera' : 'tercera';
      }
    };
    window.addEventListener('keydown', this.alTeclaV);

    this.resizeObserver = new ResizeObserver(() => this.ajustarAlContenedor());
    if (canvas.parentElement !== null) {
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  establecerMapa(mapa: Mapa): void {
    this.mapa = mapa;
    if (this.scene === null) {
      return;
    }
    if (this.sueloPlaceholder !== null) {
      this.scene.remove(this.sueloPlaceholder);
      this.sueloPlaceholder.geometry.dispose();
      (this.sueloPlaceholder.material as MeshToonMaterial).dispose();
      this.sueloPlaceholder = null;
    }
    this.mundo?.dispose();
    if (this.mundo !== null) {
      this.scene.remove(this.mundo.grupo);
    }
    this.mundo = construirMundo3D(mapa);
    this.scene.add(this.mundo.grupo);
  }

  renderizar(estado: EstadoVisual, idJugadorPropio: string | null): void {
    if (this.renderer === null || this.scene === null || this.camera === null) {
      return; // no iniciado o ya destruido: no-op seguro (el rAF de partida.component sigue vivo durante el swap)
    }
    const ahoraMs = performance.now();
    const deltaSec = (ahoraMs - this.ultimoFrameMs) / 1000;
    this.ultimoFrameMs = ahoraMs;

    this.zona?.actualizar(estado.zona);
    this.idPropioActual = idJugadorPropio;
    this.actualizarJugadores(estado.jugadores, idJugadorPropio, ahoraMs, deltaSec);
    this.actualizarProyectiles(estado.proyectiles);
    this.actualizarBotines(estado.botines, ahoraMs);
    this.actualizarNumerosDanio(estado.numerosDanio);
    this.actualizarCamara(estado.jugadores, idJugadorPropio);
    this.animarMundo(ahoraMs, deltaSec);
    this.renderer.render(this.scene, this.camera);
  }

  saltarJugadorPropio(): void {
    if (this.idPropioActual) {
      const entidad = this.jugadores.get(this.idPropioActual);
      if (entidad && !entidad.saltando && !entidad.muerto) {
        entidad.saltando = true;
        entidad.velocidadSalto = 6.0;
      }
    }
  }

  /** Diffing con retencion (Decision #7): crea/actualiza/quita rigs de chibi segun el snapshot, nunca reconstruye por frame. */
  private actualizarJugadores(jugadores: readonly JugadorVisual[], idPropio: string | null, ahoraMs: number, deltaSec: number): void {
    if (this.scene === null) {
      return;
    }
    const vistos = new Set<string>();
    for (const jugador of jugadores) {
      vistos.add(jugador.id);
      let entidad = this.jugadores.get(jugador.id);
      if (entidad === undefined) {
        entidad = this.crearEntidadJugador(jugador);
        this.jugadores.set(jugador.id, entidad);
        this.scene.add(entidad.rig.raiz);
      }
      this.actualizarEntidadJugador(entidad, jugador, jugador.id === idPropio, ahoraMs);
      entidad.rig.playerPrefab.actualizarAnimacion(deltaSec);
    }
    for (const [id, entidad] of this.jugadores) {
      if (!vistos.has(id)) {
        this.destruirEntidadJugador(entidad);
        this.jugadores.delete(id);
      }
    }
  }

  private crearEntidadJugador(jugador: JugadorVisual): EntidadJugador {
    const rig = construirChibi(jugador.personaje);
    rig.fase = faseDesdeId(jugador.id);

    const anillo = new Mesh(
      new RingGeometry(RADIO_CUERPO_CHIBI * 1.1, RADIO_CUERPO_CHIBI * 1.4, 24),
      new MeshBasicMaterial({ color: COLOR_ANILLO_PROPIO, side: DoubleSide, transparent: true, opacity: 0.9 }),
    );
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = 0.02;
    anillo.visible = false;
    rig.raiz.add(anillo);

    const hp = crearSpriteCanvas(80, 16, { x: 0.8, y: 0.16 });
    hp.sprite.position.y = ALTURA_TOPE_CABEZA + 0.35;
    rig.raiz.add(hp.sprite);

    return { rig, anillo, hp, hpMostrado: null, muerto: false, posicionAnterior: null, alturaSalto: 0, velocidadSalto: 0, saltando: false };
  }

  private actualizarEntidadJugador(entidad: EntidadJugador, jugador: JugadorVisual, propio: boolean, ahoraMs: number): void {
    const distanciaMovida = entidad.posicionAnterior === null
      ? 0
      : Math.hypot(jugador.x - entidad.posicionAnterior.x, jugador.y - entidad.posicionAnterior.y);
    entidad.posicionAnterior = { x: jugador.x, y: jugador.y };

    if (entidad.saltando) {
      entidad.alturaSalto += entidad.velocidadSalto * 0.016;
      entidad.velocidadSalto -= 18.0 * 0.016;
      if (entidad.alturaSalto <= 0) {
        entidad.alturaSalto = 0;
        entidad.velocidadSalto = 0;
        entidad.saltando = false;
      }
    }

    const pos = aVector3(jugador.x, jugador.y);
    pos.y += entidad.alturaSalto;
    entidad.rig.raiz.position.copy(pos);

    const muerto = jugador.estadoVida === 'MUERTO';
    if (muerto !== entidad.muerto) {
      this.aplicarEstadoVida(entidad, muerto);
    }
    if (!muerto) {
      entidad.rig.raiz.rotation.y = -jugador.angulo + Math.PI / 2;
    }

    const enPrimeraPersona = propio && this.tipoCamara === 'primera';

    // Dibujar el arma equipada actualmente en la mano del personaje (o en la cámara en 1ra persona)
    if (entidad.rig.armas) {
      const armaActual = jugador.arma;
      for (const [tipo, mesh] of Object.entries(entidad.rig.armas)) {
        if (tipo === armaActual) {
          if (enPrimeraPersona && this.camera) {
            this.camera.add(mesh);
            mesh.visible = !muerto;
            mesh.position.set(0.18, -0.22, -0.45);
            mesh.rotation.set(0, Math.PI, 0);
          } else {
            entidad.rig.playerPrefab.equiparArma(mesh);
            mesh.visible = !muerto;
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
          }
        } else {
          mesh.visible = false;
        }
      }
    }

    if (enPrimeraPersona) {
      entidad.rig.raiz.visible = false;
    } else {
      entidad.rig.raiz.visible = true;
    }

    const moviendo = !muerto && distanciaMovida > UMBRAL_MOVIMIENTO_BOBBING;
    entidad.rig.cuerpo.position.y = ALTURA_CUERPO_CHIBI
      + (moviendo ? Math.sin((ahoraMs / 1000) * 10 + entidad.rig.fase) * 0.06 : 0);

    entidad.anillo.visible = propio;
    entidad.hp.sprite.visible = !muerto;
    if (!muerto && entidad.hpMostrado !== jugador.hp) {
      entidad.hpMostrado = jugador.hp;
      this.redibujarHp(entidad.hp, jugador.hp);
    }
  }

  /** Muerto: tumba el chibi (rotation.z) y pone TODOS sus materiales en gris; vivo: restaura los colores originales. */
  private aplicarEstadoVida(entidad: EntidadJugador, muerto: boolean): void {
    entidad.muerto = muerto;
    entidad.rig.raiz.rotation.z = muerto ? Math.PI / 2 : 0;
    const colorGris = 0x8a8f9c;
    entidad.rig.materiales.forEach((material, indice) => {
      material.color.setHex(muerto ? colorGris : entidad.rig.coloresOriginales[indice]);
    });
  }

  private redibujarHp(hp: SpriteCanvas, valor: number): void {
    const fraccion = Math.max(0, Math.min(1, valor / VIDA_MAX));
    const color = fraccion > 0.5 ? '#4ade80' : fraccion > 0.25 ? '#ffcc00' : '#ff4444';
    hp.redibujar((ctx, ancho, alto) => {
      // Fondo negro de la barra
      ctx.fillStyle = 'rgba(17, 20, 36, 0.8)';
      ctx.fillRect(0, 0, ancho, alto);
      
      // Barra rellena interna con margen de 2px
      if (fraccion > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(2, 2, (ancho - 4) * fraccion, alto - 4);
      }

      // Contorno negro grueso
      ctx.strokeStyle = '#111424';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, ancho - 3, alto - 3);

      // Texto de vida (ej: 78/100)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Sombra de texto para legibilidad
      ctx.strokeStyle = '#111424';
      ctx.lineWidth = 2.5;
      const texto = `${valor}/100`;
      ctx.strokeText(texto, ancho / 2, alto / 2);
      ctx.fillText(texto, ancho / 2, alto / 2);
    });
  }

  private destruirEntidadJugador(entidad: EntidadJugador): void {
    entidad.rig.raiz.removeFromParent();
    entidad.hp.dispose();
  }

  /** Pool fijo (Decision #7): visibilidad/posicion por indice, sin crear/destruir geometria por frame. */
  private actualizarProyectiles(proyectiles: readonly ProyectilVisual[]): void {
    for (let i = 0; i < this.proyectiles.length; i++) {
      const mesh = this.proyectiles[i];
      const proyectil = proyectiles[i];
      if (proyectil === undefined) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.copy(aVector3(proyectil.x, proyectil.y, ALTURA_CABEZA_CENTRO * 0.6));
    }
  }

  private actualizarBotines(botines: readonly BotinVisual[], ahoraMs: number): void {
    if (this.scene === null) {
      return;
    }
    const vistos = new Set<number>();
    for (const botin of botines) {
      vistos.add(botin.id);
      let prefab = this.botines.get(botin.id);
      if (prefab === undefined) {
        prefab = new BotinPrefab(botin.tipo);
        this.scene.add(prefab.contenedor);
        this.botines.set(botin.id, prefab);
      }
      const flote = Math.sin((ahoraMs / 1000) * 2.5 + botin.id) * 0.08;
      prefab.contenedor.position.copy(aVector3(botin.x, botin.y, 0.25 + flote));
      prefab.contenedor.rotation.y = (ahoraMs / 1000) * 1.5 + botin.id;
    }
    for (const [id, prefab] of this.botines) {
      if (!vistos.has(id)) {
        prefab.contenedor.removeFromParent();
        prefab.destruir();
        this.botines.delete(id);
      }
    }
  }

  /** Numeros de dano flotantes con fade (pool fijo, mismo tope que 2D/ISO): sube y se desvanece con la edad. */
  private actualizarNumerosDanio(numeros: readonly NumeroDanio[]): void {
    const ahora = performance.now();
    for (let i = 0; i < this.textosDanio.length; i++) {
      const entrada = this.textosDanio[i];
      const numero = numeros[i];
      if (numero === undefined) {
        entrada.sprite.sprite.visible = false;
        entrada.textoActual = null;
        continue;
      }
      const edad = ahora - numero.creadoEn;
      if (edad > DURACION_DANIO_MS) {
        entrada.sprite.sprite.visible = false;
        entrada.textoActual = null;
        continue;
      }
      const texto = String(numero.cantidad);
      if (entrada.textoActual !== texto) {
        entrada.textoActual = texto;
        entrada.sprite.redibujar((ctx, ancho, alto) => {
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#111424';
          ctx.strokeText(texto, ancho / 2, alto / 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(texto, ancho / 2, alto / 2);
        });
      }
      entrada.sprite.sprite.visible = true;
      entrada.sprite.sprite.material.opacity = 1 - edad / DURACION_DANIO_MS;
      entrada.sprite.sprite.position.copy(aVector3(numero.x, numero.y, ALTURA_TOPE_CABEZA + edad * 0.001));
    }
  }

  /** Sway de copas + agua "respirando" en color y con oleaje de vertices (B5) — reutiliza los helpers de paleta-mapa. */
  private animarMundo(ahoraMs: number, deltaSec: number): void {
    if (this.mundo === null) {
      return;
    }
    const t = ahoraMs / 1000;
    this.mundo.nubes.animar(deltaSec);
    for (const arbol of this.mundo.arboles) {
      arbol.copa.rotation.z = Math.sin(t * 1.5 + arbol.fase) * 0.05;
    }
    for (const agua of this.mundo.aguas) {
      const mezcla = (Math.sin(faseAgua(ahoraMs) * Math.PI * 2) + 1) / 2;
      const mat = agua.mesh.material as MeshStandardMaterial;
      if (mat.color) {
        mat.color.setHex(lerpColor(agua.colorBase, agua.colorClaro, mezcla));
      }
      const posiciones = agua.mesh.geometry.attributes['position'];
      for (let i = 0; i < posiciones.count; i++) {
        const vx = posiciones.getX(i);
        const vy = posiciones.getY(i);
        posiciones.setZ(i, Math.sin(vx * 2 + t + vy) * 0.05);
      }
      posiciones.needsUpdate = true;
    }
  }

  private actualizarCamara(jugadores: readonly JugadorVisual[], idPropio: string | null): void {
    if (this.camera === null) {
      return;
    }
    const propio = jugadores.find((jugador) => jugador.id === idPropio);
    if (propio === undefined || propio.estadoVida !== 'VIVO') {
      if (this.ultimaPoseCamara !== null) {
        this.camera.position.copy(this.ultimaPoseCamara.posicion);
        this.camera.lookAt(this.ultimaPoseCamara.mira);
      }
      return;
    }
    const centro = aVector3(propio.x, propio.y, 0);
    const yaw = propio.angulo;

    if (this.tipoCamara === 'primera') {
      const dirX = Math.cos(yaw);
      const dirZ = Math.sin(yaw);
      const posicion = centro.clone().add(new Vector3(dirX * 0.15, ALTURA_MIRA, dirZ * 0.15));
      const lookAtOffsetY = Math.sin(0.6 - this.pitch) * 5;
      const mira = centro.clone().add(new Vector3(dirX * 10, ALTURA_MIRA + lookAtOffsetY, dirZ * 10));
      this.camera.position.copy(posicion);
      this.camera.lookAt(mira);
      this.ultimaPoseCamara = { posicion, mira };
    } else {
      const d = DISTANCIA_CAMARA;
      // Posición orbital esférica 3D completa usando yaw (giro horizontal) y pitch (giro vertical del mouse)
      const dx = -d * Math.cos(this.pitch) * Math.cos(yaw);
      const dy = d * Math.sin(this.pitch);
      const dz = -d * Math.cos(this.pitch) * Math.sin(yaw);

      const posicion = centro.clone().add(new Vector3(dx, dy, dz));
      const mira = centro.clone().add(new Vector3(0, ALTURA_MIRA, 0));
      this.camera.position.copy(posicion);
      this.camera.lookAt(mira);
      this.ultimaPoseCamara = { posicion, mira };
    }
  }

  redimensionar(): void {
    this.ajustarAlContenedor();
  }

  destruir(): void {
    if (this.alMoverMouse !== null) {
      window.removeEventListener('mousemove', this.alMoverMouse);
      this.alMoverMouse = null;
    }
    if (this.alTeclaV !== null) {
      window.removeEventListener('keydown', this.alTeclaV);
      this.alTeclaV = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.mundo?.dispose();
    this.zona?.dispose();
    // Los Sprite (barras de HP, numeros de dano) no son Mesh: el traverse de abajo no los alcanza, se liberan aparte.
    for (const entidad of this.jugadores.values()) {
      entidad.hp.dispose();
    }
    for (const texto of this.textosDanio) {
      texto.sprite.dispose();
    }
    if (this.scene !== null) {
      this.scene.traverse((objeto) => {
        if (objeto instanceof Mesh) {
          objeto.geometry.dispose();
          this.liberarMaterial(objeto.material);
        }
      });
    }
    if (this.camera !== null) {
      while (this.camera.children.length > 0) {
        this.camera.remove(this.camera.children[0]);
      }
    }
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.mapa = null;
    this.sueloPlaceholder = null;
    this.mundo = null;
    this.zona = null;
    this.jugadores.clear();
    this.botines.forEach((prefab) => {
      prefab.contenedor.removeFromParent();
      prefab.destruir();
    });
    this.botines.clear();
    this.proyectiles.length = 0;
    this.textosDanio.length = 0;
    this.ultimaPoseCamara = null;
  }

  private liberarMaterial(material: Material | Material[]): void {
    const materiales = Array.isArray(material) ? material : [material];
    for (const unMaterial of materiales) {
      for (const valor of Object.values(unMaterial)) {
        if (valor instanceof Texture) {
          valor.dispose();
        }
      }
      unMaterial.dispose();
    }
  }

  private ajustarAlContenedor(): void {
    if (this.renderer === null || this.camera === null || this.canvas === null) {
      return;
    }
    const contenedor = this.canvas.parentElement;
    const ancho = contenedor?.clientWidth ?? window.innerWidth;
    const alto = contenedor?.clientHeight ?? window.innerHeight;
    this.renderer.setSize(ancho, alto, false);
    this.camera.aspect = ancho / Math.max(alto, 1);
    this.camera.updateProjectionMatrix();
  }
}
