import { BoxGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
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
  constructor(ancho = 6.0, alto = 6.0) {
    super();
    this.construirCabana(ancho, alto);
  }

  private construirCabana(ancho: number, alto: number): void {
    const grupoCasa = new Group();

    // Paredes de madera alineadas al AABB real
    const matParedes = new MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
      metalness: 0.1,
    });
    const paredes = new Mesh(new BoxGeometry(ancho * 0.95, 3.2, alto * 0.95), matParedes);
    paredes.position.y = 1.6;

    // Techo a dos aguas
    const matTecho = new MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
    });
    const techo = new Mesh(new ConeGeometry(Math.max(ancho, alto) * 0.75, 2.2, 4), matTecho);
    techo.position.y = 4.3;
    techo.rotation.y = Math.PI / 4;

    // Marco de puerta
    const matPuerta = new MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.9,
    });
    const puerta = new Mesh(new BoxGeometry(1.2, 2.2, alto * 0.96), matPuerta);
    puerta.position.set(0, 1.1, 0);

    grupoCasa.add(paredes, techo, puerta);
    this.configurarSombras(grupoCasa);
    this.contenedor.add(grupoCasa);
  }

  tieneModeloValido(): boolean {
    return true;
  }
}

export class CajaPrefab extends BasePrefab {
  constructor(ancho = 3.5, alto = 3.5) {
    super();
    this.construirCaja(ancho, alto);
  }

  private construirCaja(ancho: number, alto: number): void {
    const grupoCaja = new Group();

    // Caja de madera reforzada escalada exactamente al AABB de colisión
    const matMadera = new MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.6,
      metalness: 0.2,
    });
    const tamanoXZ = Math.min(ancho, alto) * 0.95;
    const cuerpoCaja = new Mesh(new BoxGeometry(tamanoXZ, tamanoXZ, tamanoXZ), matMadera);
    cuerpoCaja.position.y = tamanoXZ / 2;

    // Herrajes de hierro en bordes
    const matHierro = new MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.8,
    });
    const marco = new Mesh(new BoxGeometry(tamanoXZ * 1.02, tamanoXZ * 0.15, tamanoXZ * 1.02), matHierro);
    marco.position.y = tamanoXZ / 2;

    grupoCaja.add(cuerpoCaja, marco);
    this.configurarSombras(grupoCaja);
    this.contenedor.add(grupoCaja);
  }

  tieneModeloValido(): boolean {
    return true;
  }
}
