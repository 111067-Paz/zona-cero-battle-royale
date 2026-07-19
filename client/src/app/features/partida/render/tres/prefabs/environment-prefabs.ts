import { Object3D } from 'three';
import { ConfigManager } from '../config/config-manager';
import { AssetManager } from '../managers/asset-manager';
import { BasePrefab } from './base-prefab';

const CATALOGO_ARBOLES = [
  'assets/vegetation/MapleTree_1.gltf', 'assets/vegetation/MapleTree_2.gltf', 'assets/vegetation/MapleTree_3.gltf', 'assets/vegetation/MapleTree_4.gltf', 'assets/vegetation/MapleTree_5.gltf',
  'assets/vegetation/BirchTree_1.gltf', 'assets/vegetation/BirchTree_2.gltf', 'assets/vegetation/BirchTree_3.gltf', 'assets/vegetation/BirchTree_4.gltf', 'assets/vegetation/BirchTree_5.gltf',
  'assets/vegetation/DeadTree_1.gltf', 'assets/vegetation/DeadTree_2.gltf', 'assets/vegetation/DeadTree_3.gltf', 'assets/vegetation/DeadTree_4.gltf', 'assets/vegetation/DeadTree_5.gltf', 'assets/vegetation/DeadTree_6.gltf', 'assets/vegetation/DeadTree_7.gltf', 'assets/vegetation/DeadTree_8.gltf',
  'assets/vegetation/PineTree_1.fbx', 'assets/vegetation/PineTree_2.fbx', 'assets/vegetation/PineTree_3.fbx',
  'assets/vegetation/PalmTree_1.fbx', 'assets/vegetation/PalmTree_2.fbx'
];

const CATALOGO_ROCAS = [
  'assets/vegetation/Rock_1.fbx', 'assets/vegetation/Rock_2.fbx', 'assets/vegetation/Rock_3.fbx', 'assets/vegetation/Rock_4.fbx', 'assets/vegetation/Rock_5.fbx'
];

export class TreePrefab extends BasePrefab {
  private modeloLoaded: Object3D | null = null;

  constructor(urlEspecifica?: string) {
    super();
    this.inicializar(urlEspecifica);
  }

  private inicializar(urlEspecifica?: string): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const urlTarget = urlEspecifica ?? CATALOGO_ARBOLES[Math.floor(Math.random() * CATALOGO_ARBOLES.length)];
    const modeloClonado = assetMgr.models.clonarModelo(urlTarget) ?? assetMgr.obtenerModeloEntorno('ARBOL');

    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;
      const cfg = configMgr.environment['ARBOL'];
      let baseScale = cfg?.scale ?? 1.2;
      if (urlTarget.endsWith('.fbx')) {
        baseScale = 0.015;
      }
      const escalaAleatoria = baseScale * (0.85 + Math.random() * 0.4);
      this.modeloLoaded.scale.setScalar(escalaAleatoria);
      this.modeloLoaded.rotation.y = Math.random() * Math.PI * 2;

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

  constructor(urlEspecifica?: string) {
    super();
    this.inicializar(urlEspecifica);
  }

  private inicializar(urlEspecifica?: string): void {
    const assetMgr = AssetManager.getInstancia();
    const configMgr = ConfigManager.getInstancia();

    const urlTarget = urlEspecifica ?? CATALOGO_ROCAS[Math.floor(Math.random() * CATALOGO_ROCAS.length)];
    const modeloClonado = assetMgr.models.clonarModelo(urlTarget) ?? assetMgr.obtenerModeloEntorno('ROCA');

    if (modeloClonado !== null) {
      this.modeloLoaded = modeloClonado.escena;
      const cfg = configMgr.environment['ROCA'];
      let baseScale = cfg?.scale ?? 0.015;
      if (urlTarget.endsWith('.gltf')) {
        baseScale = 1.0;
      }
      const escalaAleatoria = baseScale * (0.8 + Math.random() * 0.5);
      this.modeloLoaded.scale.setScalar(escalaAleatoria);
      this.modeloLoaded.rotation.y = Math.random() * Math.PI * 2;

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
