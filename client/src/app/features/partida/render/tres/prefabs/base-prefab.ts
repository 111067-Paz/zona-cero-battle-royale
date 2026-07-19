import { Group, Mesh, Object3D } from 'three';

export abstract class BasePrefab {
  readonly contenedor = new Group();

  protected configurarSombras(objeto: Object3D): void {
    objeto.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  destruir(): void {
    this.contenedor.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    this.contenedor.clear();
  }
}
