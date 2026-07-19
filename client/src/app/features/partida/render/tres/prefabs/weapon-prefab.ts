import { Object3D } from 'three';
import { ConfigManager } from '../config/config-manager';
import { AssetManager } from '../managers/asset-manager';
import { BasePrefab } from './base-prefab';

export class WeaponPrefab extends BasePrefab {
  private modeloLoaded: Object3D | null = null;

  constructor(public readonly tipoArma: string) {
    super();
    this.inicializar();
  }

  private inicializar(): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const key = this.tipoArma.toLowerCase();
    const targetKey = configMgr.weapons[key] ? key : 'pistola';
    const modeloClonado = assetMgr.obtenerModeloArma(targetKey);

    // REGLA ARQUITECTÓNICA: Verificar `if (modelo != null)` antes de agregar a la Scene Graph
    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;

      const cfg = configMgr.weapons[targetKey];
      if (cfg) {
        if (cfg.scale) this.modeloLoaded.scale.setScalar(cfg.scale);

        const pos = cfg.positionOffset ?? cfg.offset;
        if (pos) this.modeloLoaded.position.set(pos[0], pos[1], pos[2]);

        const rot = cfg.rotationOffset ?? cfg.rotation;
        if (rot) {
          this.modeloLoaded.rotation.set(rot[0], rot[1], rot[2]);
        } else {
          this.modeloLoaded.rotation.y = -Math.PI / 2;
        }
      } else {
        this.modeloLoaded.rotation.y = -Math.PI / 2;
      }

      this.configurarSombras(this.modeloLoaded);
      this.contenedor.add(this.modeloLoaded);
    }
  }

  tieneModeloValido(): boolean {
    return this.modeloLoaded !== null;
  }
}
