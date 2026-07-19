import { Group, InstancedMesh, Matrix4, Mesh, Object3D } from 'three';
import { AssetManager } from '../managers/asset-manager';

export class VegetationManager {
  readonly grupo = new Group();
  private readonly instancias: InstancedMesh[] = [];

  agregarGrupoInstanciado(tipo: string, transformaciones: Matrix4[]): void {
    if (transformaciones.length === 0) return;

    const assetMgr = AssetManager.getInstancia();
    const modeloClonado = assetMgr.obtenerModeloEntorno(tipo);

    // REGLA ARQUITECTÓNICA: Si el modelo GLB no existe (null), no se crea nada en la Scene Graph
    if (modeloClonado === null) return;

    // Extraer la primera malla disponible del GLB para instanciamiento masivo VRAM
    let mallaOriginal: Mesh | null = null;
    modeloClonado.escena.traverse((child: Object3D) => {
      if (mallaOriginal === null && child instanceof Mesh) {
        mallaOriginal = child;
      }
    });

    if (mallaOriginal === null) return;

    const mesh = mallaOriginal as Mesh;
    const instancedMesh = new InstancedMesh(mesh.geometry, mesh.material, transformaciones.length);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    for (let i = 0; i < transformaciones.length; i++) {
      instancedMesh.setMatrixAt(i, transformaciones[i]);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.grupo.add(instancedMesh);
    this.instancias.push(instancedMesh);
  }

  destruir(): void {
    this.instancias.forEach((i) => {
      i.geometry.dispose();
    });
    this.instancias.length = 0;
    this.grupo.clear();
  }
}
