import { Object3D } from 'three';
import { ConfigManager } from '../config/config-manager';
import { AssetManager } from '../managers/asset-manager';
import { BasePrefab } from './base-prefab';

export class TreePrefab extends BasePrefab {
  private modeloLoaded: Object3D | null = null;

  constructor() {
    super();
    this.inicializar();
  }

  private inicializar(): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const modeloClonado = assetMgr.obtenerModeloEntorno('ARBOL');

    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;
      const cfg = configMgr.environment['ARBOL'];
      if (cfg?.scale) {
        this.modeloLoaded.scale.setScalar(cfg.scale);
      }
      this.configurarSombras(this.modeloLoaded);
      this.contenedor.add(this.modeloLoaded);
    }
  }

  tieneModeloValido(): boolean {
    return this.modeloLoaded !== null;
  }
}

export class RockPrefab extends BasePrefab {
  private modeloLoaded: Object3D | null = null;

  constructor() {
    super();
    this.inicializar();
  }

  private inicializar(): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const modeloClonado = assetMgr.obtenerModeloEntorno('ROCA');

    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;
      const cfg = configMgr.environment['ROCA'];
      if (cfg?.scale) {
        this.modeloLoaded.scale.setScalar(cfg.scale);
      }
      this.configurarSombras(this.modeloLoaded);
      this.contenedor.add(this.modeloLoaded);
    }
  }

  tieneModeloValido(): boolean {
    return this.modeloLoaded !== null;
  }
}

export class HousePrefab extends BasePrefab {
  private modeloLoaded: Object3D | null = null;

  constructor() {
    super();
    this.inicializar();
  }

  private inicializar(): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const modeloClonado = assetMgr.obtenerModeloEntorno('CARPA');

    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;
      const cfg = configMgr.environment['CARPA'];
      if (cfg?.scale) {
        this.modeloLoaded.scale.setScalar(cfg.scale);
      }
      this.configurarSombras(this.modeloLoaded);
      this.contenedor.add(this.modeloLoaded);
    }
  }

  tieneModeloValido(): boolean {
    return this.modeloLoaded !== null;
  }
}
