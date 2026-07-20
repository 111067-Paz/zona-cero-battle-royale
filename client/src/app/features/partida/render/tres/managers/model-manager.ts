import { AnimationClip, Color, Group, Mesh, MeshStandardMaterial, Object3D, TextureLoader } from 'three';
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
  private readonly loaderTexturas = new TextureLoader();
  private readonly cacheGltf = new Map<string, GLTF>();

  async cargarModelo(url: string): Promise<GLTF | null> {
    if (this.cacheGltf.has(url)) {
      return this.cacheGltf.get(url)!;
    }

    try {
      let gltf: GLTF;
      const urlLower = url.toLowerCase();

      if (urlLower.endsWith('.fbx')) {
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

      // Configurar sombras y texturas en mallas del modelo
      gltf.scene.traverse((child: Object3D) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const mat = child.material as any;
          if (mat) {
            const nameLower = (child.name || '').toLowerCase();
            const isLeaf = nameLower.includes('leaf') || nameLower.includes('leaves') || nameLower.includes('branch') || nameLower.includes('needle') || nameLower.includes('top') || nameLower.includes('frond');

            // 1. Palmeras FBX (PalmTree)
            if (urlLower.includes('palmtree')) {
              const texUrl = isLeaf ? 'assets/vegetation/PalmTree_Leaves.png' : 'assets/vegetation/PalmTree_Trunk.jpg';
              this.loaderTexturas.load(texUrl, (tex) => {
                mat.map = tex;
                mat.color.setHex(0xffffff);
                mat.needsUpdate = true;
              });
            }
            // 2. Árboles Frondosos FBX (NormalTree)
            else if (urlLower.includes('normaltree')) {
              const texUrl = isLeaf ? 'assets/vegetation/NormalTree_Leaves.png' : 'assets/vegetation/NormalTree_Bark.jpg';
              this.loaderTexturas.load(texUrl, (tex) => {
                mat.map = tex;
                mat.color.setHex(0xffffff);
                mat.needsUpdate = true;
              });
            }
            // 3. Pinos FBX (PineTree)
            else if (urlLower.includes('pinetree')) {
              const texUrl = isLeaf ? 'assets/vegetation/PineTree_Leaves.png' : 'assets/vegetation/PineTree_Bark.jpg';
              this.loaderTexturas.load(texUrl, (tex) => {
                mat.map = tex;
                mat.color.setHex(0xffffff);
                mat.needsUpdate = true;
              });
            }
            // 4. Rocas y Piedras FBX (Rock)
            else if (urlLower.includes('rock')) {
              this.loaderTexturas.load('assets/vegetation/Rocks.png', (tex) => {
                mat.map = tex;
                mat.color.setHex(0xffffff);
                mat.needsUpdate = true;
              });
            }
            // 5. Plantas FBX (Plant)
            else if (urlLower.includes('plant')) {
              mat.color = new Color(0x388e3c);
              mat.needsUpdate = true;
            }
            // Fallback general para evitar cualquier modelo blanco
            else if (!mat.map && mat.color && mat.color.getHex() === 0xffffff) {
              mat.color = new Color(isLeaf ? 0x2e7d32 : 0x6d4c41);
              mat.needsUpdate = true;
            }
          }
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
