import { Group, Mesh, Object3D, PlaneGeometry } from 'three';
import { Mapa } from '../../../../models/mapa';
import { HousePrefab, RockPrefab, TreePrefab } from './prefabs/environment-prefabs';
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
 * Construye el mundo 3D estatico utilizando TerrainManager (Chunks PBR),
 * VegetationManager (InstancedMesh) y Prefabs GLB.
 * CERO primitivas geométricas procedimentales en código.
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

  // 2. Procesar decoraciones de agua (Río / Lago) con Shader de Agua desacoplado
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

  // 3. Procesar obstáculos utilizando Prefabs GLB y verificación `if (prefab.tieneModeloValido())`
  for (const obstaculo of mapa.obstaculos) {
    switch (obstaculo.tipo) {
      case 'ARBOL': {
        const treeP = new TreePrefab();
        if (treeP.tieneModeloValido()) {
          treeP.contenedor.position.copy(aVector3(obstaculo.x + obstaculo.ancho / 2, obstaculo.y + obstaculo.alto / 2));
          grupo.add(treeP.contenedor);
          arboles.push({ copa: treeP.contenedor, fase: Math.random() * Math.PI * 2 });
        }
        break;
      }
      case 'ROCA': {
        const rockP = new RockPrefab();
        if (rockP.tieneModeloValido()) {
          rockP.contenedor.position.copy(aVector3(obstaculo.x + obstaculo.ancho / 2, obstaculo.y + obstaculo.alto / 2));
          grupo.add(rockP.contenedor);
        }
        break;
      }
      case 'CARPA':
      case 'CAJA': {
        const houseP = new HousePrefab();
        if (houseP.tieneModeloValido()) {
          houseP.contenedor.position.copy(aVector3(obstaculo.x + obstaculo.ancho / 2, obstaculo.y + obstaculo.alto / 2));
          grupo.add(houseP.contenedor);
        }
        break;
      }
    }
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
