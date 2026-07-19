import { MeshPhysicalMaterial, MeshStandardMaterial, Texture } from 'three';

export interface OpcionesPBR {
  color?: number;
  albedoMap?: Texture | null;
  normalMap?: Texture | null;
  roughnessMap?: Texture | null;
  aoMap?: Texture | null;
  roughness?: number;
  metalness?: number;
  flatShading?: boolean;
}

export class MaterialFactory {
  static createGrass(opciones: OpcionesPBR = {}): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: opciones.color ?? 0x82c341,
      map: opciones.albedoMap ?? null,
      normalMap: opciones.normalMap ?? null,
      roughnessMap: opciones.roughnessMap ?? null,
      aoMap: opciones.aoMap ?? null,
      roughness: opciones.roughness ?? 0.85,
      metalness: opciones.metalness ?? 0.05,
      flatShading: opciones.flatShading ?? true,
    });
  }

  static createRock(opciones: OpcionesPBR = {}): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: opciones.color ?? 0x64748b,
      map: opciones.albedoMap ?? null,
      normalMap: opciones.normalMap ?? null,
      roughnessMap: opciones.roughnessMap ?? null,
      roughness: opciones.roughness ?? 0.95,
      metalness: opciones.metalness ?? 0.1,
      flatShading: opciones.flatShading ?? true,
    });
  }

  static createWood(opciones: OpcionesPBR = {}): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: opciones.color ?? 0x78350f,
      map: opciones.albedoMap ?? null,
      normalMap: opciones.normalMap ?? null,
      roughness: opciones.roughness ?? 0.8,
      metalness: opciones.metalness ?? 0.0,
      flatShading: opciones.flatShading ?? true,
    });
  }

  static createMetal(opciones: OpcionesPBR = {}): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: opciones.color ?? 0x94a3b8,
      map: opciones.albedoMap ?? null,
      normalMap: opciones.normalMap ?? null,
      roughness: opciones.roughness ?? 0.3,
      metalness: opciones.metalness ?? 0.85,
      flatShading: opciones.flatShading ?? false,
    });
  }

  static createGlass(opciones: OpcionesPBR = {}): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
      color: opciones.color ?? 0xe0f2fe,
      roughness: 0.1,
      transmission: 0.9,
      transparent: true,
      opacity: 0.6,
    });
  }

  static createCharacter(opciones: OpcionesPBR = {}): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: opciones.color ?? 0xffffff,
      map: opciones.albedoMap ?? null,
      normalMap: opciones.normalMap ?? null,
      roughness: opciones.roughness ?? 0.55,
      metalness: opciones.metalness ?? 0.1,
      flatShading: opciones.flatShading ?? true,
    });
  }
}
