import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshToonMaterial, Object3D, SphereGeometry, TorusGeometry } from 'three';
import { PERSONAJES, Personaje } from '../../../../models/personajes';
import { crearGradienteToon } from './utiles-3d';

/** Exportados para que el renderer ubique la barra de HP (sobre la cabeza), el anillo del propio (radio del cuerpo) y la base del bobbing (B5). */
export const RADIO_CUERPO_CHIBI = 0.32;
export const RADIO_CABEZA_CHIBI = 0.34;
export const ALTURA_CUERPO_CHIBI = RADIO_CUERPO_CHIBI * 0.9;

const RADIO_CUERPO = RADIO_CUERPO_CHIBI;
const RADIO_CABEZA = RADIO_CABEZA_CHIBI;
const COLOR_OSCURO = 0x111424;
const COLOR_DIENTE = 0xffffff;

/**
 * Chibi 3D low-poly (Decision de arquitectura "Modelos 3D" del plan): esfera cuerpo + esfera cabeza
 * (proporcion chibi: cabeza grande) + rasgos por especie montados sobre la cabeza o el cuerpo.
 * `materiales`/`coloresOriginales` en paralelo permiten al renderer poner TODO el chibi en gris al
 * morir (y restaurarlo) sin clonar geometria ni reconstruir nada.
 */
export interface ChibiRig {
  raiz: Group;
  cuerpo: Object3D;
  cabeza: Object3D;
  /** Desfasaje determinista (seteado por el renderer con `faseDesdeId`) para que el bobbing de B5 no sincronice a todos los jugadores. */
  fase: number;
  materiales: readonly MeshToonMaterial[];
  coloresOriginales: readonly number[];
}

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
  const materialCuerpo = crearMaterial(especificacion.colorCuerpo);
  const cuerpo = new Mesh(new SphereGeometry(RADIO_CUERPO, 10, 8), materialCuerpo);
  cuerpo.position.y = RADIO_CUERPO * 0.9;
  raiz.add(cuerpo);

  const materialCabeza = crearMaterial(especificacion.colorCuerpo);
  const cabeza = new Mesh(new SphereGeometry(RADIO_CABEZA, 12, 10), materialCabeza);
  cabeza.position.y = RADIO_CUERPO * 1.7 + RADIO_CABEZA * 0.6;
  raiz.add(cabeza);

  agregarRasgos(personaje, cuerpo, cabeza, especificacion.colorDetalle, crearMaterial);

  return {
    raiz,
    cuerpo,
    cabeza,
    fase: 0,
    materiales,
    coloresOriginales: materiales.map((material) => material.color.getHex()),
  };
}

/** Hash simple y determinista de un id de jugador -> fase 0..2π (evita que todos boten sincronizados). */
export function faseDesdeId(id: string): number {
  let acumulado = 0;
  for (let i = 0; i < id.length; i++) {
    acumulado = (acumulado * 31 + id.charCodeAt(i)) % 100000;
  }
  return (acumulado / 100000) * Math.PI * 2;
}

function agregarRasgos(
  personaje: Personaje,
  cuerpo: Mesh,
  cabeza: Mesh,
  colorDetalle: number,
  crearMaterial: (color: number) => MeshToonMaterial,
): void {
  switch (personaje) {
    case 'GATO': {
      const orejaGeometria = new ConeGeometry(RADIO_CABEZA * 0.32, RADIO_CABEZA * 0.55, 4);
      for (const signo of [-1, 1]) {
        const oreja = new Mesh(orejaGeometria, cabeza.material as MeshToonMaterial);
        oreja.position.set(signo * RADIO_CABEZA * 0.55, RADIO_CABEZA * 0.8, 0);
        oreja.rotation.z = signo * -0.3;
        cabeza.add(oreja);
      }
      const materialBigote = crearMaterial(COLOR_OSCURO);
      const bigoteGeometria = new CylinderGeometry(0.008, 0.008, 0.3, 4);
      for (const signo of [-1, 1]) {
        for (const dy of [-0.03, 0.03]) {
          const bigote = new Mesh(bigoteGeometria, materialBigote);
          bigote.rotation.z = Math.PI / 2;
          bigote.position.set(signo * (RADIO_CABEZA + 0.13), dy, RADIO_CABEZA * 0.5);
          cabeza.add(bigote);
        }
      }
      return;
    }
    case 'DINO': {
      const puaGeometria = new ConeGeometry(RADIO_CUERPO * 0.16, RADIO_CUERPO * 0.4, 4);
      for (let i = 0; i < 3; i++) {
        const pua = new Mesh(puaGeometria, cuerpo.material as MeshToonMaterial);
        pua.position.set(0, RADIO_CUERPO * (0.7 + i * 0.35), -RADIO_CUERPO * (0.55 - i * 0.1));
        cuerpo.add(pua);
      }
      const materialPanza = crearMaterial(colorDetalle);
      const panza = new Mesh(new SphereGeometry(RADIO_CUERPO * 0.6, 8, 6), materialPanza);
      panza.scale.set(1, 0.8, 0.6);
      panza.position.set(0, RADIO_CUERPO * 0.1, RADIO_CUERPO * 0.55);
      cuerpo.add(panza);
      return;
    }
    case 'ROBO_PERRO': {
      const materialDetalle = crearMaterial(colorDetalle);
      const antena = new Mesh(new CylinderGeometry(0.012, 0.012, RADIO_CABEZA * 0.9, 4), materialDetalle);
      antena.position.set(0, RADIO_CABEZA * 1.15, 0);
      cabeza.add(antena);
      const puntaAntena = new Mesh(new SphereGeometry(0.045, 6, 6), materialDetalle);
      puntaAntena.position.set(0, RADIO_CABEZA * 1.7, 0);
      cabeza.add(puntaAntena);
      const visor = new Mesh(new BoxGeometry(RADIO_CABEZA * 1.1, RADIO_CABEZA * 0.32, 0.05), materialDetalle);
      visor.position.set(0, RADIO_CABEZA * 0.1, RADIO_CABEZA * 0.9);
      cabeza.add(visor);
      return;
    }
    case 'CONEJO': {
      const orejaGeometria = new CylinderGeometry(RADIO_CABEZA * 0.15, RADIO_CABEZA * 0.2, RADIO_CABEZA * 1.6, 6);
      for (const signo of [-1, 1]) {
        const oreja = new Mesh(orejaGeometria, cabeza.material as MeshToonMaterial);
        oreja.position.set(signo * RADIO_CABEZA * 0.35, RADIO_CABEZA * 1.4, 0);
        oreja.rotation.z = signo * 0.15;
        cabeza.add(oreja);
      }
      const materialDiente = crearMaterial(COLOR_DIENTE);
      const dienteGeometria = new BoxGeometry(0.05, 0.08, 0.03);
      for (const signo of [-1, 1]) {
        const diente = new Mesh(dienteGeometria, materialDiente);
        diente.position.set(signo * 0.04, -RADIO_CABEZA * 0.55, RADIO_CABEZA * 0.85);
        cabeza.add(diente);
      }
      return;
    }
    case 'ARDILLA': {
      const materialCola = crearMaterial(colorDetalle);
      const cola = new Mesh(new TorusGeometry(RADIO_CUERPO * 0.85, RADIO_CUERPO * 0.28, 6, 12, Math.PI * 1.3), materialCola);
      cola.position.set(0, RADIO_CUERPO * 0.9, -RADIO_CUERPO * 0.6);
      cola.rotation.x = Math.PI / 2.3;
      cuerpo.add(cola);
      return;
    }
    default: {
      const exhaustivo: never = personaje;
      throw new Error(`Personaje sin modelo 3D: ${exhaustivo}`);
    }
  }
}
