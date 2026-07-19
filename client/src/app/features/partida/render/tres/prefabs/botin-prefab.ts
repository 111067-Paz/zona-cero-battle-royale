import { BoxGeometry, Group, Mesh, MeshStandardMaterial, RingGeometry } from 'three';
import { AssetManager } from '../managers/asset-manager';
import { BasePrefab } from './base-prefab';

export class BotinPrefab extends BasePrefab {
  constructor(public readonly tipo: string) {
    super();
    this.construir();
  }

  private construir(): void {
    const assetMgr = AssetManager.getInstancia();

    if (this.tipo === 'BOTIQUIN') {
      // 1. Crear Botiquín Médico Pirata estilizado en 3D
      const grupoBotiquin = new Group();

      // Maletín principal (Marrón / Cuero con remaches)
      const matCuerpo = new MeshStandardMaterial({
        color: 0x92400e,
        roughness: 0.5,
        metalness: 0.2,
      });
      const cuerpo = new Mesh(new BoxGeometry(0.5, 0.35, 0.25), matCuerpo);
      cuerpo.position.y = 0.175;

      // Franja Blanca Médica en la cara frontal
      const matBlanco = new MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.3,
      });
      const franjaBlanca = new Mesh(new BoxGeometry(0.24, 0.24, 0.26), matBlanco);
      franjaBlanca.position.y = 0.175;

      // Cruz Roja de Socorro
      const matCruz = new MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.2,
        metalness: 0.1,
      });
      const cruzVertical = new Mesh(new BoxGeometry(0.06, 0.18, 0.27), matCruz);
      cruzVertical.position.y = 0.175;

      const cruzHorizontal = new Mesh(new BoxGeometry(0.18, 0.06, 0.27), matCruz);
      cruzHorizontal.position.y = 0.175;

      // Anillo perimetral verde sanación en el suelo
      const matAnillo = new MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.2,
        metalness: 0.8,
      });
      const anillo = new Mesh(new RingGeometry(0.35, 0.42, 32), matAnillo);
      anillo.rotation.x = -Math.PI / 2;
      anillo.position.y = 0.02;

      grupoBotiquin.add(cuerpo, franjaBlanca, cruzVertical, cruzHorizontal, anillo);
      this.configurarSombras(grupoBotiquin);
      this.contenedor.add(grupoBotiquin);
    } else {
      // 2. Usar modelo 3D real del arma según el tipo ('pistola', 'escopeta', 'rifle', 'sniper', 'cuchillo')
      const targetKey = this.tipo.toLowerCase();
      const modeloClonado = assetMgr.obtenerModeloArma(targetKey) ?? assetMgr.obtenerModeloArma('pistola');

      if (modeloClonado !== null) {
        const modeloArma = modeloClonado.escena;
        modeloArma.scale.setScalar(0.65);
        modeloArma.rotation.x = Math.PI / 6; // Inclinada sutilmente flotando

        // Anillo perimetral dorado en el suelo para resaltar el arma
        const matAnilloArma = new MeshStandardMaterial({
          color: 0xeab308,
          roughness: 0.2,
          metalness: 0.9,
        });
        const anilloArma = new Mesh(new RingGeometry(0.4, 0.48, 32), matAnilloArma);
        anilloArma.rotation.x = -Math.PI / 2;
        anilloArma.position.y = 0.02;

        this.configurarSombras(modeloArma);
        this.contenedor.add(modeloArma, anilloArma);
      }
    }
  }
}
