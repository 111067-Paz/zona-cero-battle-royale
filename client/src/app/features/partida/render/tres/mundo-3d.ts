import { Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import { Mapa } from '../../../../models/mapa';
import { Nubes3D } from './nubes-3d';
import { CajaPrefab, HousePrefab, PlantPrefab, RockPrefab, TreePrefab } from './prefabs/environment-prefabs';
import { WaterShader } from './shaders/water-shader';
import { Sol3D } from './sol-3d';
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
  sol: Sol3D;
  nubes: Nubes3D;
  terrainManager: TerrainManager;
  vegetationManager: VegetationManager;
  dispose(): void;
}

/**
 * Construye el mundo 3D altamente detallado de "Ultimate Stylized Nature":
 * - Terreno modular PBR (TerrainManager)
 * - Sol 3D brillante y atmósfera con Cúmulos de Nubes 3D (Sol3D, Nubes3D)
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

  // 1. Sol 3D brillante y Cúmulos de Nubes 3D en la atmósfera
  const sol = new Sol3D(new Vector3(140, 180, 75));
  const nubes = new Nubes3D(mapa.ancho, mapa.alto, 28);
  grupo.add(sol.contenedor, sol.luzDireccional, sol.luzDireccional.target, nubes.contenedor);

  // 2. Construir terreno modular PBR por Chunks
  terrainManager.construirTerreno(mapa.ancho, mapa.alto).then(() => {
    grupo.add(terrainManager.grupo);
  });

  // 3. Construir caminos de tierra (Dirt Trails)
  const matTierra = new MeshStandardMaterial({
    color: 0x6b4c33,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const anchoTotal = mapa.ancho;
  const altoTotal = mapa.alto;

  for (const deco of mapa.decoraciones) {
    if (deco.tipo === 'CAMINO') {
      const cx = deco.x + deco.ancho / 2;
      const cy = deco.y + deco.alto / 2;

      const caminoGeo = new PlaneGeometry(deco.ancho, deco.alto);
      const caminoMesh = new Mesh(caminoGeo, matTierra);
      caminoMesh.rotation.x = -Math.PI / 2;
      caminoMesh.position.copy(aVector3(cx, cy, 0.08));
      caminoMesh.receiveShadow = true;
      grupo.add(caminoMesh);
    } else if (deco.tipo === 'RIO' || deco.tipo === 'LAGO') {
      const cx = deco.x + deco.ancho / 2;
      const cy = deco.y + deco.alto / 2;

      const aguaGeo = new PlaneGeometry(deco.ancho, deco.alto, 16, 16);
      const matAgua = new MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const aguaMesh = new Mesh(aguaGeo, matAgua);
      aguaMesh.rotation.x = -Math.PI / 2;
      aguaMesh.position.copy(aVector3(cx, cy, 0.05));
      aguaMesh.receiveShadow = true;
      grupo.add(aguaMesh);

      aguas.push({
        mesh: aguaMesh,
        colorBase: 0x0284c7,
        colorClaro: 0x38bdf8,
      });
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

          // Sembrar flores y plantas decorativas en la base del árbol
          const plantP = new PlantPrefab();
          if (plantP.tieneModeloValido()) {
            plantP.contenedor.position.copy(aVector3(cx + (Math.random() - 0.5) * 3, cy + (Math.random() - 0.5) * 3));
            grupo.add(plantP.contenedor);
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
        const houseP = new HousePrefab(obstaculo.ancho, obstaculo.alto);
        houseP.contenedor.position.copy(aVector3(cx, cy));
        grupo.add(houseP.contenedor);
        break;
      }
      case 'CAJA': {
        const cajaP = new CajaPrefab(obstaculo.ancho, obstaculo.alto);
        cajaP.contenedor.position.copy(aVector3(cx, cy));
        grupo.add(cajaP.contenedor);
        break;
      }
    }
  }

  // 5. Poblar masa masiva instanciada de pasto, flores, ramas y arbustos decorativos en VRAM (850+ elementos)
  const tiposInstancias: { [key: string]: Matrix4[] } = {
    'assets/vegetation/Grass_Large.gltf': [],
    'assets/vegetation/Grass_Small.gltf': [],
    'assets/vegetation/Grass_Large_Extruded.gltf': [],
    'assets/vegetation/Flower_1.gltf': [],
    'assets/vegetation/Flower_1_Clump.gltf': [],
    'assets/vegetation/Flower_2.gltf': [],
    'assets/vegetation/Flower_2_Clump.gltf': [],
    'assets/vegetation/Flower_3_Clump.gltf': [],
    'assets/vegetation/Flower_4_Clump.gltf': [],
    'assets/vegetation/Flower_5_Clump.gltf': [],
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
    'assets/rocks/Rock_1.fbx': [],
    'assets/rocks/Rock_2.fbx': [],
  };

  const clavesInstancias = Object.keys(tiposInstancias);

  // Sembrar 3,500 elementos de vegetacion tupida e intensa por toda la superficie gracias al patron FLYWEIGHT
  for (let i = 0; i < 3500; i++) {
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
    sol,
    nubes,
    terrainManager,
    vegetationManager,
    dispose(): void {
      terrainManager.destruir();
      vegetationManager.destruir();
      grupo.clear();
    },
  };
}
