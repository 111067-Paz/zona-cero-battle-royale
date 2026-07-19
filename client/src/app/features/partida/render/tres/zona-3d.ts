import { CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { ZonaVisual } from '../../estado-visual';
import { aVector3 } from './utiles-3d';

const COLOR_ZONA_ACTUAL = 0x10b981; // Verde esmeralda energetico
const COLOR_BORDE_PARED = 0x34d399;
const COLOR_ZONA_PROXIMA = 0xf59e0b; // Amarillo / naranja advertencia
const ALTURA_CILINDRO = 60;

export interface Zona3D {
  grupo: Group;
  actualizar(zona: ZonaVisual | null): void;
  dispose(): void;
}

/**
 * Barrera visual 3D de la Zona Segura (Gas / Forcefield):
 * - Pared cilíndrica vertical de 60u de altura
 * - Anillo de luz en la base del borde actual
 * - Anillo indicador de la próxima fase de contracción en el suelo
 */
export function construirZona3D(): Zona3D {
  const grupo = new Group();

  // 1. Pared cilíndrica principal (Gas / Pared de Energía)
  const materialPared = new MeshBasicMaterial({
    color: COLOR_ZONA_ACTUAL,
    transparent: true,
    opacity: 0.38,
    side: DoubleSide,
    depthWrite: false,
  });
  const cilindro = new Mesh(new CylinderGeometry(1, 1, ALTURA_CILINDRO, 64, 1, true), materialPared);
  cilindro.position.y = ALTURA_CILINDRO / 2;

  // 2. Anillo luminoso en el suelo del borde actual
  const materialAnilloBorde = new MeshBasicMaterial({
    color: COLOR_BORDE_PARED,
    transparent: true,
    opacity: 0.85,
    side: DoubleSide,
    depthWrite: false,
  });
  const anilloBorde = new Mesh(new RingGeometry(0.98, 1.02, 64), materialAnilloBorde);
  anilloBorde.rotation.x = -Math.PI / 2;
  anilloBorde.position.y = 0.05;

  // 3. Anillo perimetral de la próxima zona objetivo
  const materialProxima = new MeshBasicMaterial({
    color: COLOR_ZONA_PROXIMA,
    transparent: true,
    opacity: 0.75,
    side: DoubleSide,
    depthWrite: false,
  });
  const anilloProximo = new Mesh(new RingGeometry(0.97, 1.03, 64), materialProxima);
  anilloProximo.rotation.x = -Math.PI / 2;
  anilloProximo.position.y = 0.04;

  grupo.add(cilindro, anilloBorde, anilloProximo);
  grupo.visible = false;

  return {
    grupo,
    actualizar(zona: ZonaVisual | null): void {
      if (zona === null) {
        grupo.visible = false;
        return;
      }
      grupo.visible = true;
      grupo.position.copy(aVector3(zona.cx, zona.cy));
      const radioActual = Math.max(zona.radio, 0.01);
      const radioProximo = Math.max(zona.radioProximo, 0.01);

      cilindro.scale.set(radioActual, 1, radioActual);
      anilloBorde.scale.set(radioActual, radioActual, 1);
      anilloProximo.scale.set(radioProximo, radioProximo, 1);
    },
    dispose(): void {
      cilindro.geometry.dispose();
      materialPared.dispose();
      anilloBorde.geometry.dispose();
      materialAnilloBorde.dispose();
      anilloProximo.geometry.dispose();
      materialProxima.dispose();
    },
  };
}
