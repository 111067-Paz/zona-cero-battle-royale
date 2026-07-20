import { Group, Mesh, PlaneGeometry } from 'three';
import { ConfigManager } from '../config/config-manager';
import { AssetManager } from '../managers/asset-manager';
import { MaterialFactory } from '../materials/material-factory';

export interface ChunkTerreno {
  mesh: Mesh;
  x: number;
  y: number;
}

export class TerrainManager {
  readonly grupo = new Group();
  private readonly chunks: ChunkTerreno[] = [];

  async construirTerreno(ancho: number, alto: number): Promise<void> {
    const configMgr = ConfigManager.getInstancia();
    const assetMgr = AssetManager.getInstancia();
    const cfgTerrain = configMgr.terrain;

    const chunkSize = cfgTerrain?.chunkSize ?? 64;
    const segments = cfgTerrain?.segments ?? 1;

    // Cargar texturas PBR si existen
    const matConfig = cfgTerrain?.materials?.['cesped'];
    const albedo = matConfig?.albedoMap ? await assetMgr.textures.cargarTextura(matConfig.albedoMap) : null;
    const normal = matConfig?.normalMap ? await assetMgr.textures.cargarTextura(matConfig.normalMap) : null;
    const roughnessMap = matConfig?.roughnessMap ? await assetMgr.textures.cargarTextura(matConfig.roughnessMap) : null;
    const aoMap = matConfig?.aoMap ? await assetMgr.textures.cargarTextura(matConfig.aoMap) : null;

    const materialTerreno = MaterialFactory.createGrass({
      color: 0x478c2e,
      albedoMap: albedo,
      normalMap: normal,
      roughnessMap: roughnessMap,
      aoMap: aoMap,
      roughness: matConfig?.roughness ?? 0.85,
      metalness: matConfig?.metalness ?? 0.05,
    });

    const cantidadX = Math.ceil(ancho / chunkSize);
    const cantidadY = Math.ceil(alto / chunkSize);

    for (let ix = 0; ix < cantidadX; ix++) {
      for (let iy = 0; iy < cantidadY; iy++) {
        const geoChunk = new PlaneGeometry(chunkSize, chunkSize, segments, segments);
        const meshChunk = new Mesh(geoChunk, materialTerreno);

        meshChunk.rotation.x = -Math.PI / 2;
        meshChunk.position.set(
          ix * chunkSize + chunkSize / 2,
          0,
          iy * chunkSize + chunkSize / 2
        );
        meshChunk.receiveShadow = true;

        this.grupo.add(meshChunk);
        this.chunks.push({ mesh: meshChunk, x: ix, y: iy });
      }
    }
  }

  destruir(): void {
    this.chunks.forEach((c) => {
      c.mesh.geometry.dispose();
    });
    this.chunks.length = 0;
    this.grupo.clear();
  }
}
