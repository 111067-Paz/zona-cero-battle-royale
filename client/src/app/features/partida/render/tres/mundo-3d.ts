import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { DecoracionMapa, Mapa, RectanguloMapa } from '../../../../models/mapa';
import {
  COLOR_ARBUSTO,
  COLOR_ARBUSTO_CLARO,
  COLOR_CAMINO,
  COLOR_CESPED,
  COLOR_FLOR_CENTRO,
  COLOR_FLOR_PETALO,
  COLOR_LAGO,
  COLOR_LAGO_CLARO,
  COLOR_RIO,
  COLOR_RIO_CLARO,
  especificacionObstaculo,
  EspecificacionObstaculo,
  lerpColor,
  semillaDeterministica,
} from '../paleta-mapa';
import { aVector3, crearGradienteToon } from './utiles-3d';

/** `alturaPx` de la paleta -> unidades de mundo: misma ESCALA_Y (12px = 1u) que usa el ISO. */
const ALTURA_POR_PIXEL = 1 / 12;
const CANTIDAD_FLORES = 3;
const CANTIDAD_BOLAS_ARBUSTO = 3;

/** Copa de UN arbol del cluster, con su fase determinista para el sway de B5 (`sin(t·1.5 + fase)`). */
export interface ArbolAnimado {
  copa: Object3D;
  fase: number;
}

/** Agua (RIO/LAGO) con sus dos tonos, para el "respirar" de color y el oleaje de vertices en B5. */
export interface AguaAnimada {
  mesh: Mesh<PlaneGeometry, MeshToonMaterial>;
  colorBase: number;
  colorClaro: number;
}

export interface Mundo3D {
  grupo: Group;
  arboles: readonly ArbolAnimado[];
  aguas: readonly AguaAnimada[];
  dispose(): void;
}

/** Recursos COMPARTIDOS por todo el mundo (una sola textura de madera para todos los cajones del mapa). */
interface RecursosMundo {
  gradiente: DataTexture;
  geometriaCajon: BoxGeometry;
  materialCajon: MeshToonMaterial;
}

interface ResultadoObstaculo {
  objeto: Object3D;
  /** Solo ARBOL: TODAS las copas del cluster (1-5 arboles por obstaculo), para que B5 las balancee. */
  copas?: Object3D[];
}

/**
 * Construye el mundo estatico 3D (suelo + obstaculos tipados + decoraciones) a partir del `Mapa`
 * que baja por REST. Los obstaculos grandes (hasta 30x30u) se renderizan como CLUSTERS de piezas
 * chicas dentro de su huella real de colision (la colision NO cambia — es del servidor): una CAJA
 * de 22x22 es una pila de cajones, un ARBOL de 30x30 es una arboleda de hasta 5 arboles. Low-poly
 * a proposito: coherente con "cero assets" y con las sombras "blob" en vez de shadow maps.
 */
export function construirMundo3D(mapa: Mapa): Mundo3D {
  const grupo = new Group();
  const gradiente = crearGradienteToon();
  const arboles: ArbolAnimado[] = [];
  const aguas: AguaAnimada[] = [];

  const especificacionCaja = especificacionObstaculo('CAJA');
  const recursos: RecursosMundo = {
    gradiente,
    geometriaCajon: new BoxGeometry(1, 1, 1),
    materialCajon: new MeshToonMaterial({
      map: texturaMadera(especificacionCaja.colorPrincipal, especificacionCaja.colorSecundario),
      gradientMap: gradiente,
    }),
  };

  const suelo = new Mesh(
    new PlaneGeometry(mapa.ancho, mapa.alto),
    new MeshToonMaterial({ color: COLOR_CESPED, gradientMap: gradiente }),
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.copy(aVector3(mapa.ancho / 2, mapa.alto / 2));
  grupo.add(suelo);

  for (const decoracion of mapa.decoraciones) {
    const objeto = construirDecoracion(decoracion, gradiente, aguas);
    grupo.add(objeto);
  }

  for (const obstaculo of mapa.obstaculos) {
    const resultado = construirObstaculo(obstaculo, recursos);
    grupo.add(resultado.objeto);
    resultado.copas?.forEach((copa, indice) => {
      const fase = semillaDeterministica(obstaculo.x + indice * 13.7, obstaculo.y + indice * 5.3) * Math.PI * 2;
      arboles.push({ copa, fase });
    });
  }

  return {
    grupo,
    arboles,
    aguas,
    dispose(): void {
      // dispose() de Three es idempotente: los cajones comparten geometria/material y se
      // liberan muchas veces sin problema — no hace falta llevar un registro aparte.
      grupo.traverse((objeto) => {
        if (objeto instanceof Mesh) {
          objeto.geometry.dispose();
          const materiales = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
          for (const material of materiales) {
            const conMapa = material as MeshToonMaterial;
            conMapa.map?.dispose();
            material.dispose();
          }
        }
      });
      gradiente.dispose();
    },
  };
}

function construirObstaculo(rectangulo: RectanguloMapa, recursos: RecursosMundo): ResultadoObstaculo {
  const especificacion = especificacionObstaculo(rectangulo.tipo);
  switch (rectangulo.tipo) {
    case 'CAJA':
      return construirCaja(rectangulo, especificacion, recursos);
    case 'ARBOL':
      return construirArbol(rectangulo, especificacion, recursos.gradiente);
    case 'ROCA':
      return construirRoca(rectangulo, especificacion, recursos.gradiente);
    case 'CARPA':
      return construirCarpa(rectangulo, especificacion, recursos.gradiente);
    default: {
      const exhaustivo: never = rectangulo.tipo;
      throw new Error(`Tipo de obstaculo sin modelo 3D: ${exhaustivo}`);
    }
  }
}

/**
 * Distribuye `cantidad` posiciones deterministas dentro de un rectangulo de mundo, en grilla +
 * jitter (sin loops de rechazo): base del cluster de cajones/arboles/rocas. `margen` aleja los
 * centros del borde de la huella (radio de la pieza mas grande que se va a plantar ahi).
 */
function posicionesEnHuella(rectangulo: RectanguloMapa, cantidad: number, margen: number): { x: number; y: number }[] {
  const columnas = Math.max(1, Math.ceil(Math.sqrt(cantidad)));
  const filas = Math.max(1, Math.ceil(cantidad / columnas));
  const anchoUtil = Math.max(rectangulo.ancho - margen * 2, 0.01);
  const altoUtil = Math.max(rectangulo.alto - margen * 2, 0.01);
  const celdaAncho = anchoUtil / columnas;
  const celdaAlto = altoUtil / filas;
  const posiciones: { x: number; y: number }[] = [];
  for (let i = 0; i < cantidad; i++) {
    const col = i % columnas;
    const fila = Math.floor(i / columnas);
    const jitterX = (semillaDeterministica(rectangulo.x + i * 3.1, rectangulo.y + i * 1.7) - 0.5) * celdaAncho * 0.4;
    const jitterY = (semillaDeterministica(rectangulo.y + i * 2.3, rectangulo.x + i * 4.9) - 0.5) * celdaAlto * 0.4;
    posiciones.push({
      x: rectangulo.x + margen + celdaAncho * (col + 0.5) + jitterX,
      y: rectangulo.y + margen + celdaAlto * (fila + 0.5) + jitterY,
    });
  }
  return posiciones;
}

/** CAJA: pila/grilla de cajones individuales (madera real) dentro de la huella — nunca una losa. */
function construirCaja(rectangulo: RectanguloMapa, especificacion: EspecificacionObstaculo, recursos: RecursosMundo): ResultadoObstaculo {
  const alturaMundo = especificacion.alturaPx * ALTURA_POR_PIXEL;
  const celdasX = Math.max(1, Math.round(rectangulo.ancho / 5));
  const celdasZ = Math.max(1, Math.round(rectangulo.alto / 5));
  const celdaAncho = rectangulo.ancho / celdasX;
  const celdaAlto = rectangulo.alto / celdasZ;
  const alturaCajon = alturaMundo * 0.62;
  const alturaCajonChico = alturaMundo * 0.4;
  const grupo = new Group();

  let indice = 0;
  for (let fila = 0; fila < celdasZ; fila++) {
    for (let col = 0; col < celdasX; col++) {
      const mundoX = rectangulo.x + celdaAncho * (col + 0.5);
      const mundoY = rectangulo.y + celdaAlto * (fila + 0.5);
      const semilla = semillaDeterministica(rectangulo.x + indice * 3.7, rectangulo.y + indice * 5.1);
      const escala = 0.8 + semilla * 0.15;
      const anguloJitter = (semilla - 0.5) * 0.3;

      const cajon = new Mesh(recursos.geometriaCajon, recursos.materialCajon);
      cajon.scale.set(celdaAncho * escala, alturaCajon, celdaAlto * escala);
      cajon.position.copy(aVector3(mundoX, mundoY, alturaCajon / 2));
      cajon.rotation.y = anguloJitter;
      grupo.add(cajon);

      const semillaCapa = semillaDeterministica(rectangulo.x + indice * 9.3, rectangulo.y + indice * 2.1);
      if (semillaCapa > 0.62) {
        const escalaChica = 0.5 + semillaCapa * 0.2;
        const chico = new Mesh(recursos.geometriaCajon, recursos.materialCajon);
        chico.scale.set(celdaAncho * escalaChica, alturaCajonChico, celdaAlto * escalaChica);
        chico.position.copy(aVector3(mundoX, mundoY, alturaCajon + alturaCajonChico / 2));
        chico.rotation.y = -anguloJitter;
        grupo.add(chico);
      }
      indice++;
    }
  }
  return { objeto: grupo };
}

/** ARBOL: arboleda de 1-5 arboles (tronco conico + copa multicapa) segun el area de la huella. */
function construirArbol(rectangulo: RectanguloMapa, especificacion: EspecificacionObstaculo, gradiente: DataTexture): ResultadoObstaculo {
  const alturaMundo = especificacion.alturaPx * ALTURA_POR_PIXEL;
  const area = rectangulo.ancho * rectangulo.alto;
  const cantidad = Math.min(5, Math.max(1, Math.round(area / 140)));
  const radioCopaBase = Math.min(rectangulo.ancho, rectangulo.alto) / (cantidad > 1 ? 3.2 : 2);
  const posiciones = posicionesEnHuella(rectangulo, cantidad, radioCopaBase);
  const grupo = new Group();
  const copas: Object3D[] = [];

  posiciones.forEach((posicion, indice) => {
    const semilla = semillaDeterministica(rectangulo.x + indice * 6.7, rectangulo.y + indice * 3.3);
    const radioCopa = radioCopaBase * (0.85 + semilla * 0.3);
    const alturaArbol = alturaMundo * (0.75 + 0.4 * semilla) * (cantidad > 1 ? 0.8 : 1);
    const alturaTronco = alturaArbol * 0.4;

    const tronco = new Mesh(
      new CylinderGeometry(radioCopa * 0.14, radioCopa * 0.32, alturaTronco, 16),
      new MeshToonMaterial({ color: especificacion.colorSecundario, gradientMap: gradiente }),
    );
    tronco.position.copy(aVector3(posicion.x, posicion.y, alturaTronco / 2));
    grupo.add(tronco);

    const copa = new Group();
    const colorBase = lerpColor(especificacion.colorPrincipal, 0x000000, 0.12 * semilla);
    const esferaBase = new Mesh(new SphereGeometry(radioCopa, 32, 24), new MeshToonMaterial({ color: colorBase, gradientMap: gradiente }));
    esferaBase.position.y = radioCopa * 0.5;
    copa.add(esferaBase);

    const desplazamiento = semillaDeterministica(posicion.x, posicion.y) - 0.5;
    const esferaMedia = new Mesh(
      new SphereGeometry(radioCopa * 0.72, 32, 24),
      new MeshToonMaterial({ color: lerpColor(especificacion.colorPrincipal, 0xffffff, 0.1), gradientMap: gradiente }),
    );
    esferaMedia.position.set(desplazamiento * radioCopa * 0.4, radioCopa * 1.15, desplazamiento * radioCopa * 0.4);
    copa.add(esferaMedia);

    if (radioCopa > 2) {
      const esferaTope = new Mesh(
        new SphereGeometry(radioCopa * 0.5, 32, 24),
        new MeshToonMaterial({ color: lerpColor(especificacion.colorPrincipal, 0xffffff, 0.2), gradientMap: gradiente }),
      );
      esferaTope.position.y = radioCopa * 1.7;
      copa.add(esferaTope);
    }

    // El Group entero pivota en la union con el tronco: el sway de B5 rota `copa.rotation.z` ahi.
    copa.position.copy(aVector3(posicion.x, posicion.y, alturaTronco));
    grupo.add(copa);
    copas.push(copa);
  });

  return { objeto: grupo, copas };
}

/** ROCA: grupo de 2-3 icosaedros facetados, deformados y rotados de forma determinista. */
function construirRoca(rectangulo: RectanguloMapa, especificacion: EspecificacionObstaculo, gradiente: DataTexture): ResultadoObstaculo {
  const area = rectangulo.ancho * rectangulo.alto;
  const cantidad = area > 250 ? 3 : 2;
  const radioPrincipal = Math.min(rectangulo.ancho, rectangulo.alto) * 0.38;
  const posiciones = posicionesEnHuella(rectangulo, cantidad, radioPrincipal * 0.6);
  const grupo = new Group();

  posiciones.forEach((posicion, indice) => {
    const semilla = semillaDeterministica(rectangulo.x + indice * 4.1, rectangulo.y + indice * 7.9);
    const radio = indice === 0 ? radioPrincipal : radioPrincipal * (0.5 + semilla * 0.2);
    const material = new MeshToonMaterial({
      color: lerpColor(especificacion.colorPrincipal, especificacion.colorSecundario, semilla * 0.5),
      gradientMap: gradiente,
    });
    const roca = new Mesh(icosaedroFacetado(radio), material);
    roca.scale.set(0.7 + semilla * 0.6, 0.75 * (0.7 + semilla * 0.4), 0.7 + (1 - semilla) * 0.6);
    roca.rotation.set(semilla * Math.PI, semilla * Math.PI * 2, semilla * Math.PI * 0.5);
    roca.position.copy(aVector3(posicion.x, posicion.y, (radio * roca.scale.y) / 2));
    grupo.add(roca);
  });

  return { objeto: grupo };
}

/**
 * `MeshToonMaterial` no soporta `flatShading` (a diferencia de Standard/Phong/Lambert) — el
 * facetado se logra a nivel de GEOMETRIA: `toNonIndexed()` separa cada triangulo (deja de compartir
 * vertices con sus vecinos) y `computeVertexNormals()` sobre esa geometria da una normal por cara
 * en vez de una promediada, que es exactamente el look "roca facetada" que buscamos.
 */
function icosaedroFacetado(radio: number): BufferGeometry {
  const base = new IcosahedronGeometry(radio, 0);
  // IcosahedronGeometry(detail: 0) ya sale SIN indice (three.js emite un warning si igual se
  // llama a toNonIndexed sobre algo que ya lo esta) — solo convertir si hace falta.
  const geometria = base.index === null ? base : base.toNonIndexed();
  geometria.computeVertexNormals();
  return geometria;
}

/** CARPA: base + techo (como antes) + mastil con banderin en la punta + puerta oscura en el frente. */
function construirCarpa(rectangulo: RectanguloMapa, especificacion: EspecificacionObstaculo, gradiente: DataTexture): ResultadoObstaculo {
  const alturaMundo = especificacion.alturaPx * ALTURA_POR_PIXEL;
  const centro = aVector3(rectangulo.x + rectangulo.ancho / 2, rectangulo.y + rectangulo.alto / 2);
  const radioBase = Math.min(rectangulo.ancho, rectangulo.alto) / 2;
  const alturaBase = alturaMundo * 0.25;
  const grupo = new Group();

  const base = new Mesh(
    new CylinderGeometry(radioBase, radioBase, alturaBase, 4),
    new MeshToonMaterial({ color: especificacion.colorSecundario, gradientMap: gradiente }),
  );
  base.position.copy(centro).setY(alturaBase / 2);
  base.rotation.y = Math.PI / 4;
  grupo.add(base);

  const techo = new Mesh(
    new ConeGeometry(radioBase * 1.08, alturaMundo - alturaBase, 4),
    new MeshToonMaterial({ color: especificacion.colorPrincipal, gradientMap: gradiente }),
  );
  techo.position.copy(centro).setY(alturaBase + (alturaMundo - alturaBase) / 2);
  techo.rotation.y = Math.PI / 4;
  grupo.add(techo);

  const mastil = new Mesh(
    new CylinderGeometry(0.05, 0.05, 0.8, 4),
    new MeshToonMaterial({ color: especificacion.colorSecundario, gradientMap: gradiente }),
  );
  mastil.position.copy(centro).setY(alturaMundo + 0.4);
  grupo.add(mastil);

  const banderin = new Mesh(
    new ConeGeometry(0.18, 0.35, 4),
    new MeshToonMaterial({ color: 0xffcc00, gradientMap: gradiente }),
  );
  banderin.rotation.z = Math.PI / 2;
  banderin.position.copy(centro).setY(alturaMundo + 0.65);
  grupo.add(banderin);

  const puerta = new Mesh(
    new PlaneGeometry(radioBase * 0.5, alturaBase * 1.5),
    new MeshToonMaterial({
      color: lerpColor(especificacion.colorPrincipal, 0x000000, 0.45),
      gradientMap: gradiente,
      side: DoubleSide,
    }),
  );
  puerta.position.set(centro.x, alturaBase * 0.75, centro.z + radioBase * 0.98);
  grupo.add(puerta);

  return { objeto: grupo };
}

function construirDecoracion(decoracion: DecoracionMapa, gradiente: DataTexture, aguas: AguaAnimada[]): Object3D {
  const centro = aVector3(decoracion.x + decoracion.ancho / 2, decoracion.y + decoracion.alto / 2);
  switch (decoracion.tipo) {
    case 'RIO':
    case 'LAGO': {
      const colorBase = decoracion.tipo === 'RIO' ? COLOR_RIO : COLOR_LAGO;
      const colorClaro = decoracion.tipo === 'RIO' ? COLOR_RIO_CLARO : COLOR_LAGO_CLARO;
      const material = new MeshToonMaterial({ color: colorBase, gradientMap: gradiente, transparent: true, opacity: 0.92 });
      const mesh = new Mesh(new PlaneGeometry(decoracion.ancho, decoracion.alto, 8, 8), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(centro);
      aguas.push({ mesh, colorBase, colorClaro });
      return mesh;
    }
    case 'CAMINO': {
      const mesh = new Mesh(
        new PlaneGeometry(decoracion.ancho, decoracion.alto),
        new MeshToonMaterial({ color: COLOR_CAMINO, gradientMap: gradiente }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(centro);
      return mesh;
    }
    case 'FLOR': {
      const grupo = new Group();
      for (let i = 0; i < CANTIDAD_FLORES; i++) {
        const tx = semillaDeterministica(decoracion.x + i * 7.3, decoracion.y + i * 3.1);
        const ty = semillaDeterministica(decoracion.y + i * 11.7, decoracion.x + i * 5.9);
        const flor = construirFlor();
        flor.position.copy(aVector3(decoracion.x + tx * decoracion.ancho, decoracion.y + ty * decoracion.alto, 0.05));
        grupo.add(flor);
      }
      return grupo;
    }
    case 'ARBUSTO': {
      const grupo = new Group();
      const radioBase = Math.min(decoracion.ancho, decoracion.alto) / 2;
      for (let i = 0; i < CANTIDAD_BOLAS_ARBUSTO; i++) {
        const semilla = semillaDeterministica(decoracion.x + i * 5.3, decoracion.y + i * 2.9);
        const semillaY = semillaDeterministica(decoracion.y + i * 3.7, decoracion.x + i * 6.1);
        const radio = radioBase * (0.55 + semilla * 0.25);
        const bola = new Mesh(
          new SphereGeometry(radio, 32, 24),
          new MeshToonMaterial({ color: i === 0 ? COLOR_ARBUSTO_CLARO : COLOR_ARBUSTO, gradientMap: gradiente }),
        );
        bola.position.copy(aVector3(
          decoracion.x + decoracion.ancho / 2 + (semilla - 0.5) * radioBase,
          decoracion.y + decoracion.alto / 2 + (semillaY - 0.5) * radioBase,
          radio * 0.7,
        ));
        grupo.add(bola);
      }
      return grupo;
    }
    default: {
      const mesh = new Mesh(
        new PlaneGeometry(decoracion.ancho, decoracion.alto),
        new MeshToonMaterial({ color: COLOR_CESPED, gradientMap: gradiente }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(centro);
      return mesh;
    }
  }
}

function construirFlor(): Object3D {
  const grupo = new Group();
  const petalo = new Mesh(new SphereGeometry(0.15, 6, 4), new MeshToonMaterial({ color: COLOR_FLOR_PETALO }));
  petalo.position.y = 0.15;
  const centro = new Mesh(new SphereGeometry(0.08, 6, 4), new MeshToonMaterial({ color: COLOR_FLOR_CENTRO }));
  centro.position.y = 0.22;
  grupo.add(petalo, centro);
  return grupo;
}

/** Textura de madera para los cajones: vetas + 4 tablas con juntas + refuerzo en X + bisel de borde. Generada en canvas, cero assets. */
function texturaMadera(colorPrincipal: number, colorSecundario: number): CanvasTexture {
  const tam = 128;
  const canvas = document.createElement('canvas');
  canvas.width = tam;
  canvas.height = tam;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('No se pudo obtener el contexto 2d de la textura de madera');
  }

  ctx.fillStyle = colorCss(colorPrincipal);
  ctx.fillRect(0, 0, tam, tam);

  ctx.strokeStyle = colorCss(lerpColor(colorPrincipal, colorSecundario, 0.4));
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const y0 = (tam / 6) * i + 6;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(tam * 0.3, y0 - 4, tam * 0.7, y0 + 4, tam, y0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = colorCss(colorSecundario);
  ctx.lineWidth = 3;
  for (let i = 1; i < 4; i++) {
    const y = (tam * i) / 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tam, y);
    ctx.stroke();
  }

  ctx.lineWidth = 8;
  ctx.strokeStyle = colorCss(colorSecundario);
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.lineTo(tam - 4, tam - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tam - 4, 4);
  ctx.lineTo(4, tam - 4);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = colorCss(lerpColor(colorSecundario, 0xffffff, 0.25));
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.lineTo(tam - 4, tam - 6);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = colorCss(lerpColor(colorPrincipal, 0xffffff, 0.25));
  ctx.beginPath();
  ctx.moveTo(2, tam - 2);
  ctx.lineTo(2, 2);
  ctx.lineTo(tam - 2, 2);
  ctx.stroke();
  ctx.strokeStyle = colorCss(lerpColor(colorPrincipal, 0x000000, 0.3));
  ctx.beginPath();
  ctx.moveTo(2, tam - 2);
  ctx.lineTo(tam - 2, tam - 2);
  ctx.lineTo(tam - 2, 2);
  ctx.stroke();

  return new CanvasTexture(canvas);
}

function colorCss(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
