import { BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, MeshToonMaterial, Object3D, PlaneGeometry, SphereGeometry, TorusGeometry } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
  materiales: readonly (MeshStandardMaterial | MeshToonMaterial)[];
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
  const materiales: MeshStandardMaterial[] = [];

  const crearMaterial = (color: number): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, flatShading: true });
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

  // 2. Torso (Cuerpo principal Low Poly esculpido con sombras)
  const materialCuerpo = crearMaterial(especificacion.colorCuerpo);
  const cuerpo = new Mesh(new SphereGeometry(RADIO_CUERPO, 14, 10), materialCuerpo);
  cuerpo.position.y = RADIO_CUERPO * 0.9;
  cuerpo.castShadow = true;
  cuerpo.receiveShadow = true;
  raiz.add(cuerpo);

  // 3. Cabeza (Caricaturesca Low Poly estilizada con sombras)
  const materialCabeza = crearMaterial(especificacion.colorCuerpo);
  const cabeza = new Mesh(new SphereGeometry(RADIO_CABEZA, 16, 12), materialCabeza);
  cabeza.position.y = RADIO_CUERPO * 1.7 + RADIO_CABEZA * 0.6;
  cabeza.castShadow = true;
  cabeza.receiveShadow = true;
  raiz.add(cabeza);

  // 4. Extremidades articuladas (Brazos y Piernas Low Poly)
  const legGeo = new CylinderGeometry(0.06, 0.06, 0.35, 8);
  for (const signo of [-1, 1]) {
    const pierna = new Mesh(legGeo, materialCuerpo);
    pierna.position.set(signo * 0.16, -RADIO_CUERPO * 0.7, 0);
    pierna.castShadow = true;
    pierna.receiveShadow = true;
    cuerpo.add(pierna);
  }

  // Brazo izquierdo (Reposo)
  const armGeo = new CylinderGeometry(0.05, 0.05, 0.4, 8);
  const brazoIzq = new Mesh(armGeo, materialCuerpo);
  brazoIzq.position.set(-RADIO_CUERPO * 1.25, 0.1, 0);
  brazoIzq.rotation.z = 0.2;
  brazoIzq.castShadow = true;
  brazoIzq.receiveShadow = true;
  cuerpo.add(brazoIzq);

  // Brazo derecho (Apuntado frontal)
  const brazoDer = new Mesh(armGeo, materialCuerpo);
  brazoDer.position.set(RADIO_CUERPO * 1.25, 0.1, 0.1);
  brazoDer.rotation.x = -Math.PI / 2.3; // Apunta hacia adelante
  brazoDer.castShadow = true;
  brazoDer.receiveShadow = true;
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

  // Activar sombras proyectadas y recibidas en todas las piezas hijas
  raiz.traverse((child) => {
    if (child instanceof Mesh && child !== sombra) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

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

/** Cargador helper para importar modelos GLB externos e integrarlos en el mundo con sombras. */
export function cargarModeloGLB(url: string, alCargar: (modelo: Group) => void): void {
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    alCargar(gltf.scene);
  });
}

function crearArmas3D(crearMaterial: (color: number) => MeshStandardMaterial): { [tipo: string]: Group } {
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
  crearMaterial: (color: number) => MeshStandardMaterial,
): void {
  const materialMetal = crearMaterial(0xa0a5b0);
  const materialNegro = crearMaterial(COLOR_OSCURO);

  switch (personaje) {
    case 'GATO': {
      // Orejas de gato 3D suaves (16 caras)
      const orejaGeometria = new ConeGeometry(RADIO_CABEZA * 0.32, RADIO_CABEZA * 0.55, 16);
      for (const signo of [-1, 1]) {
        const oreja = new Mesh(orejaGeometria, cabeza.material as MeshToonMaterial);
        oreja.position.set(signo * RADIO_CABEZA * 0.55, RADIO_CABEZA * 0.8, 0);
        oreja.rotation.z = signo * -0.3;
        cabeza.add(oreja);
      }
      // Bigotes 3D suaves (8 caras)
      const bigoteGeometria = new CylinderGeometry(0.008, 0.008, 0.3, 8);
      for (const signo of [-1, 1]) {
        for (const dy of [-0.03, 0.03]) {
          const bigote = new Mesh(bigoteGeometria, materialNegro);
          bigote.rotation.z = Math.PI / 2;
          bigote.position.set(signo * (RADIO_CABEZA + 0.13), dy, RADIO_CABEZA * 0.5);
          cabeza.add(bigote);
        }
      }
      // Casco de acero 3D suave (32, 24)
      const casco = new Mesh(new SphereGeometry(RADIO_CABEZA * 1.05, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), materialMetal);
      casco.position.y = 0.05;
      cabeza.add(casco);
      // Hombreras 3D suaves (16, 12)
      for (const signo of [-1, 1]) {
        const hombrera = new Mesh(new SphereGeometry(0.08, 16, 12), materialMetal);
        hombrera.position.set(signo * RADIO_CUERPO * 1.25, 0.28, 0);
        cuerpo.add(hombrera);
      }
      return;
    }
    case 'DINO': {
      // Púas de Dino 3D suaves (12 caras)
      const puaGeometria = new ConeGeometry(RADIO_CUERPO * 0.16, RADIO_CUERPO * 0.4, 12);
      for (let i = 0; i < 3; i++) {
        const pua = new Mesh(puaGeometria, cuerpo.material as MeshToonMaterial);
        pua.position.set(0, RADIO_CUERPO * (0.7 + i * 0.35), -RADIO_CUERPO * (0.55 - i * 0.1));
        cuerpo.add(pua);
      }
      // Panza clara 3D suave (20, 16)
      const materialPanza = crearMaterial(colorDetalle);
      const panza = new Mesh(new SphereGeometry(RADIO_CUERPO * 0.6, 20, 16), materialPanza);
      panza.scale.set(1, 0.8, 0.6);
      panza.position.set(0, RADIO_CUERPO * 0.1, RADIO_CUERPO * 0.55);
      cuerpo.add(panza);

      // Cola de Dino 3D suave (16 caras)
      const cola = new Mesh(new ConeGeometry(RADIO_CUERPO * 0.3, RADIO_CUERPO * 1.1, 16), cuerpo.material as MeshToonMaterial);
      cola.position.set(0, -RADIO_CUERPO * 0.2, -RADIO_CUERPO * 0.95);
      cola.rotation.x = -Math.PI / 3;
      cuerpo.add(cola);

      // Antiparras Rojas 3D
      const materialRojo = crearMaterial(0xff3333);
      const materialVidrio = crearMaterial(0x33ffff);
      const marcoAntiparra = new Mesh(new BoxGeometry(RADIO_CABEZA * 1.4, RADIO_CABEZA * 0.38, RADIO_CABEZA * 0.4), materialRojo);
      marcoAntiparra.position.set(0, 0, RADIO_CABEZA * 0.8);
      cabeza.add(marcoAntiparra);

      for (const signo of [-1, 1]) {
        const lente = new Mesh(new CylinderGeometry(RADIO_CABEZA * 0.22, RADIO_CABEZA * 0.22, 0.05, 24), materialVidrio);
        lente.rotation.x = Math.PI / 2;
        lente.position.set(signo * RADIO_CABEZA * 0.38, 0, RADIO_CABEZA * 0.2);
        marcoAntiparra.add(lente);
      }
      return;
    }
    case 'ROBO_PERRO': {
      const materialDetalle = crearMaterial(colorDetalle);
      // Antena 3D suave (12 caras)
      const antena = new Mesh(new CylinderGeometry(0.012, 0.012, RADIO_CABEZA * 0.9, 12), materialDetalle);
      antena.position.set(0, RADIO_CABEZA * 1.15, 0);
      cabeza.add(antena);
      // Punta de antena 3D suave (16, 12)
      const puntaAntena = new Mesh(new SphereGeometry(0.045, 16, 12), materialDetalle);
      puntaAntena.position.set(0, RADIO_CABEZA * 1.7, 0);
      cabeza.add(puntaAntena);
      // Visor 3D
      const visor = new Mesh(new BoxGeometry(RADIO_CABEZA * 1.1, RADIO_CABEZA * 0.32, 0.05), materialDetalle);
      visor.position.set(0, RADIO_CABEZA * 0.1, RADIO_CABEZA * 0.9);
      cabeza.add(visor);

      // Jetpack propulsor 3D
      const materialBlanco = crearMaterial(0xeeeeee);
      const jetpackBase = new Mesh(new BoxGeometry(RADIO_CUERPO * 1.0, RADIO_CUERPO * 0.7, RADIO_CUERPO * 0.4), materialBlanco);
      jetpackBase.position.set(0, RADIO_CUERPO * 0.2, -RADIO_CUERPO * 0.85);
      cuerpo.add(jetpackBase);

      const materialFuego = crearMaterial(0xff7700);
      for (const signo of [-1, 1]) {
        const propulsor = new Mesh(new CylinderGeometry(RADIO_CUERPO * 0.18, RADIO_CUERPO * 0.18, RADIO_CUERPO * 0.8, 16), materialMetal);
        propulsor.position.set(signo * RADIO_CUERPO * 0.38, -RADIO_CUERPO * 0.2, 0);
        jetpackBase.add(propulsor);

        const llama = new Mesh(new ConeGeometry(RADIO_CUERPO * 0.14, RADIO_CUERPO * 0.5, 16), materialFuego);
        llama.position.set(0, -RADIO_CUERPO * 0.55, 0);
        llama.rotation.x = Math.PI;
        propulsor.add(llama);
      }
      return;
    }
    case 'CONEJO': {
      // Orejas largas 3D suaves (16 caras)
      const orejaGeometria = new CylinderGeometry(RADIO_CABEZA * 0.15, RADIO_CABEZA * 0.2, RADIO_CABEZA * 1.6, 16);
      for (const signo of [-1, 1]) {
        const oreja = new Mesh(orejaGeometria, cabeza.material as MeshToonMaterial);
        oreja.position.set(signo * RADIO_CABEZA * 0.35, RADIO_CABEZA * 1.4, 0);
        oreja.rotation.z = signo * 0.15;
        cabeza.add(oreja);
      }
      // Dientes
      const materialDiente = crearMaterial(COLOR_DIENTE);
      const dienteGeometria = new BoxGeometry(0.05, 0.08, 0.03);
      for (const signo of [-1, 1]) {
        const diente = new Mesh(dienteGeometria, materialDiente);
        diente.position.set(signo * 0.04, -RADIO_CABEZA * 0.55, RADIO_CABEZA * 0.85);
        cabeza.add(diente);
      }

      // Traje espacial neón 3D
      const materialNeonRosa = crearMaterial(0xff00bb);
      const materialCoreCian = crearMaterial(0x00ffff);
      const pecheraTraje = new Mesh(new BoxGeometry(RADIO_CUERPO * 1.25, RADIO_CUERPO * 0.8, RADIO_CUERPO * 1.05), materialNeonRosa);
      pecheraTraje.position.set(0, 0, 0);
      cuerpo.add(pecheraTraje);

      const coreLuminoso = new Mesh(new SphereGeometry(RADIO_CUERPO * 0.22, 16, 12), materialCoreCian);
      coreLuminoso.position.set(0, 0, RADIO_CUERPO * 0.55);
      cuerpo.add(coreLuminoso);
      return;
    }
    case 'ARDILLA': {
      const materialCola = crearMaterial(colorDetalle);
      // Cola en 3D suave (12, 24)
      const cola = new Mesh(new TorusGeometry(RADIO_CUERPO * 0.85, RADIO_CUERPO * 0.28, 12, 24, Math.PI * 1.3), materialCola);
      cola.position.set(0, RADIO_CUERPO * 0.9, -RADIO_CUERPO * 0.6);
      cola.rotation.x = Math.PI / 2.3;
      cuerpo.add(cola);

      // Máscara Ninja 3D
      const cintaMascara = new Mesh(new BoxGeometry(RADIO_CABEZA * 2.05, RADIO_CABEZA * 0.35, 0.05), materialNegro);
      cintaMascara.position.set(0, 0, RADIO_CABEZA * 0.85);
      cabeza.add(cintaMascara);

      for (const signo of [-1, 1]) {
        const nudo = new Mesh(new BoxGeometry(RADIO_CABEZA * 0.4, 0.08, 0.04), materialNegro);
        nudo.rotation.z = signo * 0.6;
        nudo.position.set(signo * 0.1, -0.05, -RADIO_CABEZA * 0.9);
        cabeza.add(nudo);
      }
      return;
    }
    default: {
      const exhaustivo: never = personaje;
      throw new Error(`Personaje sin modelo 3D: ${exhaustivo}`);
    }
  }
}

export function faseDesdeId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000;
}



