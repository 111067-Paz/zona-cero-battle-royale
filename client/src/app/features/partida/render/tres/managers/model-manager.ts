import { AnimationClip, Group, Mesh, Object3D } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ModeloClonado {
  escena: Group;
  animaciones: AnimationClip[];
}

export class ModelManager {
  private readonly loaderGltf = new GLTFLoader();
  private readonly loaderFbx = new FBXLoader();
  private readonly cacheGltf = new Map<string, GLTF>();

  async cargarModelo(url: string): Promise<GLTF | null> {
    if (this.cacheGltf.has(url)) {
      return this.cacheGltf.get(url)!;
    }

    try {
      let gltf: GLTF;

      if (url.toLowerCase().endsWith('.fbx')) {
        const groupFbx = await new Promise<Group>((resolve, reject) => {
          this.loaderFbx.load(
            url,
            (fbx) => resolve(fbx),
            undefined,
            (err) => reject(err),
          );
        });
        gltf = {
          scene: groupFbx,
          scenes: [groupFbx],
          animations: groupFbx.animations ?? [],
          cameras: [],
          asset: {},
          userData: {},
          parser: null as any,
        };
      } else {
        gltf = await new Promise<GLTF>((resolve, reject) => {
          this.loaderGltf.load(
            url,
            (gltfLoaded) => resolve(gltfLoaded),
            undefined,
            (error) => reject(error),
          );
        });
      }

      // Configurar sombras en mallas del modelo
      gltf.scene.traverse((child: Object3D) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.cacheGltf.set(url, gltf);
      return gltf;
    } catch (error) {
      console.warn(`[ModelManager] Asset 3D no encontrado o invalido: '${url}'`);
      return null;
    }
  }

  clonarModelo(url: string): ModeloClonado | null {
    const gltf = this.cacheGltf.get(url);
    if (!gltf) return null;

    // SkeletonUtils.clone clona correctamente esqueletos y rigs animados
    const esqueletoClonado = SkeletonUtils.clone(gltf.scene) as Group;
    return {
      escena: esqueletoClonado,
      animaciones: gltf.animations ?? [],
    };
  }

  limpiar(): void {
    this.cacheGltf.clear();
  }
}
