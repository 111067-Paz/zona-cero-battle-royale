import { Group, MeshStandardMaterial, MeshToonMaterial, Object3D } from 'three';
import { Personaje } from '../../../../models/personajes';
import { PlayerPrefab } from './prefabs/player-prefab';
import { WeaponPrefab } from './prefabs/weapon-prefab';

export const RADIO_CUERPO_CHIBI = 0.32;
export const RADIO_CABEZA_CHIBI = 0.34;
export const ALTURA_CUERPO_CHIBI = RADIO_CUERPO_CHIBI * 0.9;

export interface ChibiRig {
  raiz: Group;
  cuerpo: Object3D;
  cabeza: Object3D;
  armas: { [tipo: string]: Object3D };
  fase: number;
  materiales: readonly (MeshStandardMaterial | MeshToonMaterial)[];
  coloresOriginales: readonly number[];
  playerPrefab: PlayerPrefab;
}

/**
 * Instancia el rig del personaje delegando al 100% en PlayerPrefab y AssetManager.
 * CERO primitivas geométricas procedimentales.
 */
export function construirChibi(personaje: Personaje): ChibiRig {
  const prefab = new PlayerPrefab(personaje);
  const armas: { [tipo: string]: Object3D } = {};

  // Instanciar prefabs de armas GLB
  const tiposArma = ['PISTOLA', 'ESCOPETA', 'RIFLE', 'SNIPER', 'CUCHILLO', 'ESPADA', 'FUSTA'];
  for (const tipo of tiposArma) {
    const wPrefab = new WeaponPrefab(tipo);
    armas[tipo] = wPrefab.contenedor;
    if (wPrefab.tieneModeloValido()) {
      wPrefab.contenedor.visible = false;
      prefab.equiparArma(wPrefab.contenedor);
    }
  }

  return {
    raiz: prefab.contenedor,
    cuerpo: prefab.contenedor,
    cabeza: prefab.contenedor,
    armas,
    fase: 0,
    materiales: [],
    coloresOriginales: [],
    playerPrefab: prefab,
  };
}

export function faseDesdeId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000;
}
