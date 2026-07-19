import { Material } from 'three';

export class MaterialManager {
  private readonly cacheMateriales = new Map<string, Material>();

  registrar(clave: string, material: Material): Material {
    this.cacheMateriales.set(clave, material);
    return material;
  }

  obtener(clave: string): Material | null {
    return this.cacheMateriales.get(clave) ?? null;
  }

  limpiar(): void {
    this.cacheMateriales.forEach((m) => m.dispose());
    this.cacheMateriales.clear();
  }
}
