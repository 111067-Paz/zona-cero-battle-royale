import { ConfigManager } from '../config/config-manager';
import { AudioManager } from './audio-manager';
import { MaterialManager } from './material-manager';
import { ModelManager, ModeloClonado } from './model-manager';
import { TextureManager } from './texture-manager';

export class AssetManager {
  private static instancia: AssetManager | null = null;

  readonly models = new ModelManager();
  readonly textures = new TextureManager();
  readonly materials = new MaterialManager();
  readonly audio = new AudioManager();

  static getInstancia(): AssetManager {
    if (!AssetManager.instancia) {
      AssetManager.instancia = new AssetManager();
    }
    return AssetManager.instancia;
  }

  async precargarAssetsBasicos(): Promise<void> {
    const config = ConfigManager.getInstancia();
    await config.cargar();

    // Precargar modelos GLB definidos en la configuracion Data-Driven
    const promesas: Promise<unknown>[] = [];

    for (const playerKey of Object.keys(config.players)) {
      const cfg = config.players[playerKey];
      if (cfg?.model) {
        promesas.push(this.models.cargarModelo(cfg.model));
      }
    }

    for (const weaponKey of Object.keys(config.weapons)) {
      const cfg = config.weapons[weaponKey];
      if (cfg?.model) {
        promesas.push(this.models.cargarModelo(cfg.model));
      }
    }

    for (const envKey of Object.keys(config.environment)) {
      const cfg = config.environment[envKey];
      if (cfg?.model) {
        promesas.push(this.models.cargarModelo(cfg.model));
      }
    }

    await Promise.all(promesas);
  }

  obtenerModeloPersonaje(especieKey: string): ModeloClonado | null {
    const config = ConfigManager.getInstancia();
    const key = especieKey.toLowerCase();
    const cfg = config.players[key] ?? config.players['barbarroja'];
    if (!cfg) {
      console.warn(`[AssetManager] No existe configuracion para el personaje '${especieKey}'`);
      return null;
    }
    return this.models.clonarModelo(cfg.model);
  }

  obtenerModeloArma(tipoArma: string): ModeloClonado | null {
    const config = ConfigManager.getInstancia();
    const key = tipoArma.toLowerCase();
    const cfg = config.weapons[key] ?? config.weapons['pistola'];
    if (!cfg) {
      console.warn(`[AssetManager] No existe configuracion para el arma '${tipoArma}'`);
      return null;
    }
    return this.models.clonarModelo(cfg.model);
  }

  obtenerModeloEntorno(tipoObstaculo: string): ModeloClonado | null {
    const config = ConfigManager.getInstancia();
    const cfg = config.environment[tipoObstaculo];
    if (!cfg) {
      console.warn(`[AssetManager] No existe configuracion para el objeto de entorno '${tipoObstaculo}'`);
      return null;
    }
    return this.models.clonarModelo(cfg.model);
  }

  limpiar(): void {
    this.models.limpiar();
    this.textures.limpiar();
    this.materials.limpiar();
    this.audio.limpiar();
  }
}
