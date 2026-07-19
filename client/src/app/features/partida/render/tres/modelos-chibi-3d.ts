import { BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshToonMaterial, Object3D, PlaneGeometry, SphereGeometry, TorusGeometry } from 'three';
import { PERSONAJES, Personaje } from '../../../../models/personajes';
import { crearGradienteToon } from './utiles-3d';

export const RADIO_CUERPO_CHIBI = 0.32;
export const RADIO_CABEZA_CHIBI = 0.34;
export const ALTURA_CUERPO_CHIBI = RADIO_CUERPO_CHIBI * 0.9;

const RADIO_CUERPO = RADIO_CUERPO_CHIBI;
const RADIO_CABEZA = RADIO_CABEZA_CHIBI;
const COLOR_OSCURO = 0x111424;
const COLOR_DIENTE = 0xffffff;

export interface ChibiRig {
  raiz: Group;
  cuerpo: Object3D;
  cabeza: Object3D;
  armas: { [tipo: string]: Object3D }; // Referencias a las mallas de armas en la mano
  fase: number;
  materiales: readonly MeshToonMaterial[];
  coloresOriginales: readonly number[];
}

/**
 * Reconstruye el personaje en 3D completo como un modelo humanoide articulado (Torso, Cabeza, Brazos, Piernas)
 * estilo cartoon de alta fidelidad, con accesorios icónicos de cada especie.
 * Incluye un set de armas 3D detalladas (Pistola, Escopeta, Rifle, Cuchillo, Fusta/Espada)
 * acopladas directamente a la mano derecha para visualizar el equipo activo en 360 grados.
 */
export function construirChibi(personaje: Personaje): ChibiRig {
  const especificacion = PERSONAJES[personaje];
  const gradiente = crearGradienteToon();
  const materiales: MeshToonMaterial[] = [];

  const crearMaterial = (color: number): MeshToonMaterial => {
    const material = new MeshToonMaterial({ color, gradientMap: gradiente });
    materiales.push(material);
    return material;
  };

  const raiz = new Group();

  // 1. Sombra blob en el suelo
  const sombraGeo = new PlaneGeometry(RADIO_CUERPO_CHIBI * 2.3, RADIO_CUERPO_CHIBI * 2.3);
  const sombraMat = new MeshBasicMaterial({
    color: 0x111424,
    transparent: true,
    opacity: 0.25,
    side: DoubleSide,
    depthWrite: false,
  });
  const sombra = new Mesh(sombraGeo, sombraMat);
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.01;
  raiz.add(sombra);

  // 2. Torso (Cuerpo principal plano con textura de pechera Toon)
  const texTorso = crearTexturaTorso(personaje, especificacion.colorCuerpo, especificacion.colorDetalle);
  const materialCuerpo = new MeshBasicMaterial({ map: texTorso, transparent: true, side: DoubleSide });
  const cuerpo = new Mesh(new PlaneGeometry(RADIO_CUERPO * 2.2, RADIO_CUERPO * 2.2), materialCuerpo);
  cuerpo.position.y = RADIO_CUERPO * 0.9;
  raiz.add(cuerpo);

  // 3. Cabeza (Plana con textura de rostro Toon)
  const texCabeza = crearTexturaCabeza(personaje, especificacion.colorCuerpo, especificacion.colorDetalle);
  const materialCabeza = new MeshBasicMaterial({ map: texCabeza, transparent: true, side: DoubleSide });
  const cabeza = new Mesh(new PlaneGeometry(RADIO_CABEZA * 2.2, RADIO_CABEZA * 2.2), materialCabeza);
  cabeza.position.y = RADIO_CUERPO * 1.7 + RADIO_CABEZA * 0.6;
  raiz.add(cabeza);

  // 4. Extremidades articuladas (Brazos y Piernas)
  const materialExtremidades = crearMaterial(especificacion.colorCuerpo);
  const legGeo = new CylinderGeometry(0.06, 0.06, 0.35, 16);
  for (const signo of [-1, 1]) {
    const pierna = new Mesh(legGeo, materialExtremidades);
    pierna.position.set(signo * 0.16, -RADIO_CUERPO * 0.7, 0);
    cuerpo.add(pierna);
  }

  // Brazo izquierdo (Reposo)
  const armGeo = new CylinderGeometry(0.05, 0.05, 0.4, 16);
  const brazoIzq = new Mesh(armGeo, materialExtremidades);
  brazoIzq.position.set(-RADIO_CUERPO * 1.25, 0.1, 0);
  brazoIzq.rotation.z = 0.2;
  cuerpo.add(brazoIzq);

  // Brazo derecho (Apuntado frontal)
  const brazoDer = new Mesh(armGeo, materialExtremidades);
  brazoDer.position.set(RADIO_CUERPO * 1.25, 0.1, 0.1);
  brazoDer.rotation.x = -Math.PI / 2.3; // Apunta hacia adelante
  cuerpo.add(brazoDer);

  // Mano derecha (Punto de anclaje para armas)
  const manoDerecha = new Object3D();
  manoDerecha.position.set(0, -0.22, 0); // Al final del brazo
  manoDerecha.rotation.x = Math.PI / 2; // Orientar arma hacia adelante
  brazoDer.add(manoDerecha);

  // 5. Set de Armas 3D en la mano
  const armas = crearArmas3D(crearMaterial);
  for (const arma of Object.values(armas)) {
    arma.visible = false;
    manoDerecha.add(arma);
  }

  // 6. Detalles específicos por personaje
  agregarRasgosYEquipo(personaje, cuerpo, cabeza, especificacion.colorDetalle, crearMaterial);

  return {
    raiz,
    cuerpo,
    cabeza,
    armas,
    fase: 0,
    materiales,
    coloresOriginales: materiales.map((material) => material.color.getHex()),
  };
}

function crearArmas3D(crearMaterial: (color: number) => MeshToonMaterial): { [tipo: string]: Group } {
  const armas: { [tipo: string]: Group } = {};

  const materialMetal = crearMaterial(0xa0a5b0);
  const materialMadera = crearMaterial(0x5a3311);
  const materialNegro = crearMaterial(0x111424);

  // PISTOLA
  const gPistola = new Group();
  const cuerpoPistola = new Mesh(new BoxGeometry(0.07, 0.09, 0.2), materialNegro);
  cuerpoPistola.position.set(0, 0.05, 0.05);
  const empunaduraPistola = new Mesh(new BoxGeometry(0.05, 0.12, 0.05), materialNegro);
  empunaduraPistola.position.set(0, 0, -0.03);
  empunaduraPistola.rotation.x = -0.3;
  gPistola.add(cuerpoPistola, empunaduraPistola);
  gPistola.scale.set(1.1, 1.1, 1.1);
  armas['PISTOLA'] = gPistola;

  // ESCOPETA
  const gEscopeta = new Group();
  const culataEscopeta = new Mesh(new BoxGeometry(0.08, 0.09, 0.22), materialMadera);
  culataEscopeta.position.set(0, 0.02, -0.1);
  const canionEscopeta = new Mesh(new CylinderGeometry(0.025, 0.025, 0.5, 6), materialMetal);
  canionEscopeta.rotation.x = Math.PI / 2;
  canionEscopeta.position.set(0, 0.04, 0.22);
  gEscopeta.add(culataEscopeta, canionEscopeta);
  gEscopeta.scale.set(1.1, 1.1, 1.1);
  armas['ESCOPETA'] = gEscopeta;

  // RIFLE
  const gRifle = new Group();
  const cuerpoRifle = new Mesh(new BoxGeometry(0.08, 0.1, 0.32), materialNegro);
  cuerpoRifle.position.set(0, 0.02, 0);
  const culataRifle = new Mesh(new BoxGeometry(0.07, 0.09, 0.25), materialMadera);
  culataRifle.position.set(0, 0, -0.22);
  const canionRifle = new Mesh(new CylinderGeometry(0.02, 0.02, 0.65, 8), materialMetal);
  canionRifle.rotation.x = Math.PI / 2;
  canionRifle.position.set(0, 0.04, 0.42);
  const miraRifle = new Mesh(new CylinderGeometry(0.013, 0.013, 0.15, 6), materialNegro);
  miraRifle.rotation.x = Math.PI / 2;
  miraRifle.position.set(0, 0.09, 0.08);
  gRifle.add(cuerpoRifle, culataRifle, canionRifle, miraRifle);
  gRifle.scale.set(1.1, 1.1, 1.1);
  armas['RIFLE'] = gRifle;

  // CUCHILLO
  const gCuchillo = new Group();
  const mangoCuchillo = new Mesh(new CylinderGeometry(0.018, 0.018, 0.15, 6), materialNegro);
  mangoCuchillo.position.set(0, 0, -0.05);
  const hojaCuchillo = new Mesh(new BoxGeometry(0.018, 0.05, 0.22), materialMetal);
  hojaCuchillo.position.set(0, 0.03, 0.1);
  gCuchillo.add(mangoCuchillo, hojaCuchillo);
  gCuchillo.scale.set(1.1, 1.1, 1.1);
  armas['CUCHILLO'] = gCuchillo;

  // FUSTA / ESPADA (Melee)
  const gEspada = new Group();
  const mangoEspada = new Mesh(new CylinderGeometry(0.02, 0.02, 0.22, 6), materialMadera);
  mangoEspada.position.set(0, 0, -0.08);
  const guardaEspada = new Mesh(new BoxGeometry(0.15, 0.04, 0.04), materialMetal);
  guardaEspada.position.set(0, 0.02, 0.01);
  const hojaEspada = new Mesh(new BoxGeometry(0.02, 0.06, 0.52), materialMetal);
  hojaEspada.position.set(0, 0.02, 0.28);
  gEspada.add(mangoEspada, guardaEspada, hojaEspada);
  gEspada.scale.set(1.1, 1.1, 1.1);
  armas['FUSTA'] = gEspada;
  armas['ESPADA'] = gEspada;

  return armas;
}

function agregarRasgosYEquipo(
  personaje: Personaje,
  cuerpo: Mesh,
  cabeza: Mesh,
  colorDetalle: number,
  crearMaterial: (color: number) => MeshToonMaterial,
): void {
  // Las características visuales y detalles ahora se dibujan directamente en las texturas Toon 2D (CanvasTexture) de la cabeza y del torso.
}

/** Hash simple y determinista de un id de jugador -> fase 0..2π (evita que todos boten sincronizados). */
export function faseDesdeId(id: string): number {
  let acumulado = 0;
  for (let i = 0; i < id.length; i++) {
    acumulado = (acumulado * 31 + id.charCodeAt(i)) % 100000;
  }
  return (acumulado / 100000) * Math.PI * 2;
}

function crearTexturaCabeza(personaje: Personaje, colorCuerpo: number, colorDetalle: number): CanvasTexture {
  const tam = 256;
  const canvas = document.createElement('canvas');
  canvas.width = tam;
  canvas.height = tam;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('No se pudo obtener el contexto 2d');

  const cCuerpo = '#' + colorCuerpo.toString(16).padStart(6, '0');
  const cDetalle = '#' + colorDetalle.toString(16).padStart(6, '0');

  // Centro del canvas
  const cx = tam / 2;
  const cy = tam / 2 + 10;
  const r = 70;

  // 1. Dibujar rasgos traseros/orejas que van detrás de la cabeza
  if (personaje === 'GATO') {
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 8;
    ctx.fillStyle = cCuerpo;
    
    // Oreja Izq
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy - 40);
    ctx.lineTo(cx - 75, cy - 110);
    ctx.lineTo(cx - 15, cy - 65);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Oreja Der
    ctx.beginPath();
    ctx.moveTo(cx + 50, cy - 40);
    ctx.lineTo(cx + 75, cy - 110);
    ctx.lineTo(cx + 15, cy - 65);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'CONEJO') {
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 8;
    ctx.fillStyle = cCuerpo;

    // Oreja Izq
    ctx.save();
    ctx.translate(cx - 30, cy - 50);
    ctx.rotate(-0.15);
    ctx.beginPath();
    ctx.roundRect(-15, -90, 30, 100, 15);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc1cc';
    ctx.beginPath();
    ctx.roundRect(-8, -80, 16, 80, 8);
    ctx.fill();
    ctx.restore();

    // Oreja Der
    ctx.save();
    ctx.translate(cx + 30, cy - 50);
    ctx.rotate(0.15);
    ctx.beginPath();
    ctx.roundRect(-15, -90, 30, 100, 15);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc1cc';
    ctx.beginPath();
    ctx.roundRect(-8, -80, 16, 80, 8);
    ctx.fill();
    ctx.restore();
  } else if (personaje === 'DINO') {
    // Púas traseras
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 7;
    ctx.fillStyle = cCuerpo;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(cx + (i - 1) * 35, cy - 70);
      ctx.rotate((i - 1) * 0.3);
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(0, -35);
      ctx.lineTo(15, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Base de la cabeza
  const grad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, cCuerpo);
  grad.addColorStop(1, cCuerpo);

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#111424';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Detalles de cara y accesorios (máscaras, antiparras, etc.)
  if (personaje === 'GATO') {
    // Bigotes
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 90, cy + 5); ctx.lineTo(cx - 50, cy + 10);
    ctx.moveTo(cx - 90, cy + 20); ctx.lineTo(cx - 50, cy + 20);
    ctx.moveTo(cx + 90, cy + 5); ctx.lineTo(cx + 50, cy + 10);
    ctx.moveTo(cx + 90, cy + 20); ctx.lineTo(cx + 50, cy + 20);
    ctx.stroke();

    // Casco
    ctx.fillStyle = '#a0a5b0';
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, Math.PI, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'DINO') {
    // Antiparras Rojas
    ctx.fillStyle = '#ff3333';
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(cx - 65, cy - 20, 130, 35, 8);
    ctx.fill(); ctx.stroke();

    // Lentes
    ctx.fillStyle = '#33ffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - 30, cy - 2, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 30, cy - 2, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'ROBO_PERRO') {
    // Visor
    ctx.fillStyle = cDetalle;
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(cx - 50, cy - 15, 100, 32, 6);
    ctx.fill(); ctx.stroke();

    // Antena
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy - r - 40);
    ctx.stroke();
    ctx.fillStyle = cDetalle;
    ctx.beginPath();
    ctx.arc(cx, cy - r - 40, 12, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'ARDILLA') {
    // Máscara Ninja
    ctx.fillStyle = '#111424';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, r - 4, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Ojos (Salvo Robo Perro que tiene el visor liso)
  if (personaje !== 'ROBO_PERRO') {
    ctx.fillStyle = '#111424';
    const dyOjos = personaje === 'DINO' ? -2 : 0;
    
    // Ojo Izq
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy + dyOjos, 10, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ojo Der
    ctx.beginPath();
    ctx.ellipse(cx + 24, cy + dyOjos, 10, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brillos de ojos (blancos)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 21, cy - 5 + dyOjos, 4, 0, Math.PI * 2);
    ctx.arc(cx - 25, cy + 4 + dyOjos, 2, 0, Math.PI * 2);
    ctx.arc(cx + 27, cy - 5 + dyOjos, 4, 0, Math.PI * 2);
    ctx.arc(cx + 23, cy + 4 + dyOjos, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Mejillas rosadas
  ctx.fillStyle = '#ff8fc7';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(cx - 42, cy + 20, 12, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 42, cy + 20, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 6. Boca o detalles de dientes
  if (personaje === 'CONEJO') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - 10, cy + 18, 9, 14, 2);
    ctx.roundRect(cx + 1, cy + 18, 9, 14, 2);
    ctx.fill(); ctx.stroke();
  } else {
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 8, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  return new CanvasTexture(canvas);
}

function crearTexturaTorso(personaje: Personaje, colorCuerpo: number, colorDetalle: number): CanvasTexture {
  const tam = 256;
  const canvas = document.createElement('canvas');
  canvas.width = tam;
  canvas.height = tam;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('No se pudo obtener el contexto 2d');

  const cCuerpo = '#' + colorCuerpo.toString(16).padStart(6, '0');
  const cDetalle = '#' + colorDetalle.toString(16).padStart(6, '0');

  const cx = tam / 2;
  const cy = tam / 2 + 10;
  const rx = 52;
  const ry = 68;

  // 1. Cuerpo base
  ctx.fillStyle = cCuerpo;
  ctx.strokeStyle = '#111424';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Detalles específicos de vestimenta/pechera
  if (personaje === 'GATO') {
    // Armadura de pecho metálica
    ctx.fillStyle = '#a0a5b0';
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, rx - 10, ry - 20, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    // Remaches de armadura
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 15, 3, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy - 15, 3, 0, Math.PI * 2);
    ctx.arc(cx - 25, cy + 20, 3, 0, Math.PI * 2);
    ctx.arc(cx + 25, cy + 20, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (personaje === 'CONEJO') {
    // Traje espacial rosa + Core cian
    ctx.fillStyle = '#ff00bb';
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, rx - 6, ry - 14, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 16, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'DINO') {
    // Panza de color detalle
    ctx.fillStyle = cDetalle;
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, rx - 14, ry - 24, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'ROBO_PERRO') {
    // Paneles mecánicos
    ctx.fillStyle = cDetalle;
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(cx - 28, cy - 15, 56, 45);
    ctx.fill(); ctx.stroke();
  } else if (personaje === 'ARDILLA') {
    // Cinturón ninja
    ctx.strokeStyle = '#111424';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - rx + 4, cy - ry + 25);
    ctx.lineTo(cx + rx - 4, cy + ry - 25);
    ctx.stroke();
  }

  return new CanvasTexture(canvas);
}



