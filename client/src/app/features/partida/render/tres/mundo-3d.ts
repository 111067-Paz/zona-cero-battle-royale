import { Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import { Mapa } from '../../../../models/mapa';
import { CajaPrefab, HousePrefab, RockPrefab, TreePrefab } from './prefabs/environment-prefabs';
import { WaterShader } from './shaders/water-shader';
import { TerrainManager } from './terrain/terrain-manager';
import { aVector3 } from './utiles-3d';
import { VegetationManager } from './vegetation/vegetation-manager';

export interface ArbolAnimado {
  copa: Object3D;
  fase: number;
}

export interface AguaAnimada {
  mesh: Mesh;
  colorBase: number;
  colorClaro: number;
}

export interface Mundo3D {
  grupo: Group;
  arboles: readonly ArbolAnimado[];
  aguas: readonly AguaAnimada[];
  terrainManager: TerrainManager;
  vegetationManager: VegetationManager;
  dispose(): void;
}

/**
 * Construye el mundo 3D altamente detallado de "Ultimate Stylized Nature":
 * - Terreno modular PBR (TerrainManager)
 * - Caminos de tierra sutiles (Dirt Trails)
 * - Bosques variados (Abedules, Arces, Pinos, Palmeras, Árboles secos y Ramas)
 * - Rocas y Piedras orgánicas
 * - Parches masivos instanciados de césped, arbustos, flores y plantas (VegetationManager)
 */
export function construirMundo3D(mapa: Mapa): Mundo3D {
  const grupo = new Group();
  const arboles: ArbolAnimado[] = [];
  const aguas: AguaAnimada[] = [];

  const terrainManager = new TerrainManager();
  const vegetationManager = new VegetationManager();

  // 1. Construir terreno modular PBR por Chunks
  terrainManager.construirTerreno(mapa.ancho, mapa.alto).then(() => {
    grupo.add(terrainManager.grupo);
  });

  // 2. Construir caminos de tierra (Dirt Trails)
  const matTierra = new MeshStandardMaterial({
    color: 0x6b4c33,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const anchoTotal = mapa.ancho;
  const altoTotal = mapa.alto;

  // Camino principal horizontal y vertical
  const caminoH = new Mesh(new PlaneGeometry(anchoTotal, 6), matTierra);
  caminoH.rotation.x = -Math.PI / 2;
  caminoH.position.set(anchoTotal / 2, 0.015, altoTotal / 2);
  caminoH.receiveShadow = true;
  grupo.add(caminoH);

  const caminoV = new Mesh(new PlaneGeometry(6, altoTotal), matTierra);
  caminoV.rotation.x = -Math.PI / 2;
  caminoV.position.set(anchoTotal / 2, 0.015, altoTotal / 2);
  caminoV.receiveShadow = true;
  grupo.add(caminoV);

  // 3. Procesar decoraciones de agua (Río / Lago) con Shader de Agua desacoplado
  for (const decoracion of mapa.decoraciones) {
    if (decoracion.tipo === 'RIO' || decoracion.tipo === 'LAGO') {
      const centro = aVector3(decoracion.x + decoracion.ancho / 2, decoracion.y + decoracion.alto / 2);
      const waterMat = WaterShader.createWaterMaterial(decoracion.tipo === 'RIO' ? 0x38bdf8 : 0x0284c7);
      const meshWater = new Mesh(new PlaneGeometry(decoracion.ancho, decoracion.alto), waterMat);
      meshWater.rotation.x = -Math.PI / 2;
      meshWater.position.copy(centro);
      meshWater.position.y = 0.02;
      grupo.add(meshWater);
      aguas.push({ mesh: meshWater, colorBase: 0x38bdf8, colorClaro: 0x7dd3fc });
    }
  }

  // 4. Procesar obstáculos utilizando Prefabs GLB/FBX de naturaleza variada
  for (const obstaculo of mapa.obstaculos) {
    const cx = obstaculo.x + obstaculo.ancho / 2;
    const cy = obstaculo.y + obstaculo.alto / 2;

    switch (obstaculo.tipo) {
      case 'ARBOL': {
        const treeP = new TreePrefab();
        if (treeP.tieneModeloValido()) {
          treeP.contenedor.position.copy(aVector3(cx, cy));
          grupo.add(treeP.contenedor);
          arboles.push({ copa: treeP.contenedor, fase: Math.random() * Math.PI * 2 });

          // Sembrar un racimo denso de árboles secundarios y vegetación alrededor
          for (let k = 0; k < 3; k++) {
            const offsetX = (Math.random() - 0.5) * 6;
            const offsetY = (Math.random() - 0.5) * 6;
            const subTree = new TreePrefab();
            if (subTree.tieneModeloValido()) {
              subTree.contenedor.position.copy(aVector3(cx + offsetX, cy + offsetY));
              grupo.add(subTree.contenedor);
              arboles.push({ copa: subTree.contenedor, fase: Math.random() * Math.PI * 2 });
            }
          }
        }
        break;
      }
      case 'ROCA': {
        const rockP = new RockPrefab();
        if (rockP.tieneModeloValido()) {
          rockP.contenedor.position.copy(aVector3(cx, cy));
          grupo.add(rockP.contenedor);

          // Rocas secundarias decorativas alrededor
          const subRock = new RockPrefab();
          if (subRock.tieneModeloValido()) {
            subRock.contenedor.position.copy(aVector3(cx + (Math.random() - 0.5) * 3, cy + (Math.random() - 0.5) * 3));
            grupo.add(subRock.contenedor);
          }
        }
        break;
      }
      case 'CARPA': {
        const houseP = new HousePrefab();
        houseP.contenedor.position.copy(aVector3(cx, cy));
        grupo.add(houseP.contenedor);
        break;
      }
      case 'CAJA': {
        const cajaP = new CajaPrefab();
        cajaP.contenedor.position.copy(aVector3(cx, cy));
        grupo.add(cajaP.contenedor);
        break;
      }
    }
  }

  // 5. Poblar masa masiva instanciada de pasto, flores, ramas y arbustos decorativos en VRAM (650+ elementos)
  const tiposInstancias: { [key: string]: Matrix4[] } = {
    'assets/vegetation/Grass_Large.gltf': [],
    'assets/vegetation/Grass_Small.gltf': [],
    'assets/vegetation/Grass_Large_Extruded.gltf': [],
    'assets/vegetation/Flower_1_Clump.gltf': [],
    'assets/vegetation/Flower_2_Clump.gltf': [],
    'assets/vegetation/Flower_3_Clump.gltf': [],
    'assets/vegetation/Bush.gltf': [],
    'assets/vegetation/Bush_Large.gltf': [],
    'assets/vegetation/Bush_Small.gltf': [],
    'assets/vegetation/Bush_Flowers.gltf': [],
    'assets/vegetation/Bush_Large_Flowers.gltf': [],
    'assets/vegetation/Bush_Small_Flowers.gltf': [],
    'assets/vegetation/Plant_1.fbx': [],
    'assets/vegetation/Plant_2.fbx': [],
    'assets/vegetation/Plant_Flowers.fbx': [],
    'assets/vegetation/DeadTree_1.gltf': [],
    'assets/vegetation/DeadTree_3.gltf': [],
  };

  const clavesInstancias = Object.keys(tiposInstancias);

  // Sembrar 650 grupos de vegetación tupida e intensa por toda la superficie
  for (let i = 0; i < 650; i++) {
    const rx = 4 + Math.random() * (anchoTotal - 8);
    const ry = 4 + Math.random() * (altoTotal - 8);
    const tipoTarget = clavesInstancias[i % clavesInstancias.length];

    const mat = new Matrix4();
    const pos = aVector3(rx, ry, 0);
    const rotY = Math.random() * Math.PI * 2;
    let scale = 0.8 + Math.random() * 0.6;

    if (tipoTarget.endsWith('.fbx')) {
      scale = 0.014;
    }

    mat.makeRotationY(rotY);
    mat.setPosition(pos);
    mat.scale(new Vector3(scale, scale, scale));

    tiposInstancias[tipoTarget].push(mat);
  }

  for (const [urlType, matrixList] of Object.entries(tiposInstancias)) {
    vegetationManager.agregarGrupoInstanciado(urlType, matrixList);
  }

  grupo.add(vegetationManager.grupo);

  return {
    grupo,
    arboles,
    aguas,
    terrainManager,
    vegetationManager,
    dispose(): void {
      terrainManager.destruir();
      vegetationManager.destruir();
      grupo.clear();
    },
  };
}
