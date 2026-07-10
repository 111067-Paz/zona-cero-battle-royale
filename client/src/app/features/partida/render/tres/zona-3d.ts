import { CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { ZonaVisual } from '../../estado-visual';
import { aVector3 } from './utiles-3d';

const COLOR_ZONA_ACTUAL = 0x4ade80;
const COLOR_ZONA_PROXIMA = 0xffcc00;
const ALTURA_CILINDRO = 14;

export interface Zona3D {
  grupo: Group;
  /** Escala/reposiciona el grupo o lo oculta si `zona` es null (nunca reconstruye geometria). */
  actualizar(zona: ZonaVisual | null): void;
  dispose(): void;
}

/**
 * Zona segura como cilindro abierto translucido (radio actual) + anillo plano en el suelo (radio al
 * que se dirige la proxima contraccion) — espejo 3D de los dos circulos que dibujan 2D/ISO.
 */
export function construirZona3D(): Zona3D {
  const grupo = new Group();

  const materialActual = new MeshBasicMaterial({
    color: COLOR_ZONA_ACTUAL,
    transparent: true,
    opacity: 0.22,
    side: DoubleSide,
    depthWrite: false,
  });
  const cilindro = new Mesh(new CylinderGeometry(1, 1, ALTURA_CILINDRO, 48, 1, true), materialActual);
  cilindro.position.y = ALTURA_CILINDRO / 2;

  const materialProxima = new MeshBasicMaterial({
    color: COLOR_ZONA_PROXIMA,
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
    depthWrite: false,
  });
  const anillo = new Mesh(new RingGeometry(0.97, 1, 64), materialProxima);
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.03;

  grupo.add(cilindro, anillo);
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
      anillo.scale.set(radioProximo, radioProximo, 1);
    },
    dispose(): void {
      cilindro.geometry.dispose();
      materialActual.dispose();
      anillo.geometry.dispose();
      materialProxima.dispose();
    },
  };
}
