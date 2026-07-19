import { Object3D } from 'three';
import { ConfigManager } from '../config/config-manager';
import { AnimationManager } from '../managers/animation-manager';
import { AssetManager } from '../managers/asset-manager';
import { SocketSystem } from '../sockets/socket-system';
import { BasePrefab } from './base-prefab';

export class PlayerPrefab extends BasePrefab {
  private animationManager: AnimationManager | null = null;
  private socketSystem: SocketSystem | null = null;
  private modeloLoaded: Object3D | null = null;

  constructor(public readonly especieKey: string) {
    super();
    this.inicializar();
  }

  private inicializar(): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const keyLower = (this.especieKey || 'barbarroja').toLowerCase();
    const cfg = configMgr.players[keyLower] ?? configMgr.players['barbarroja'];
    const targetKey = cfg ? keyLower : 'barbarroja';

    // 1. Obtener modelo GLB clonado a traves del AssetManager (Facade)
    const modeloClonado = assetMgr.obtenerModeloPersonaje(targetKey);

    // 2. REGLA ARQUITECTÓNICA: Verificar `if (modelo != null)` antes de modificar la Scene Graph
    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;

      if (cfg?.scale) {
        this.modeloLoaded.scale.setScalar(cfg.scale);
      }

      this.configurarSombras(this.modeloLoaded);
      this.contenedor.add(this.modeloLoaded);

      // 3. Inicializar sockets inteligentes
      this.socketSystem = new SocketSystem(modeloClonado.escena);

      // 4. Inicializar controlador de animaciones AnimationMixer
      if (modeloClonado.animaciones.length > 0) {
        this.animationManager = new AnimationManager(modeloClonado.escena, modeloClonado.animaciones);
      }
    }
  }

  reproducirAnimacion(nombreState: string): void {
    this.animationManager?.reproducir(nombreState);
  }

  actualizarAnimacion(deltaSec: number): void {
    this.animationManager?.actualizar(deltaSec);
  }

  equiparArma(armaObjeto: Object3D | null): void {
    if (!armaObjeto) return;
    this.socketSystem?.equiparEnSocket('RightHand', armaObjeto);
  }

  tieneModeloValido(): boolean {
    return this.modeloLoaded !== null;
  }
}
