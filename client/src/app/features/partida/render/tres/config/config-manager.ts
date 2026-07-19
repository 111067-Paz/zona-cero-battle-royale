export interface PlayerConfig {
  model: string;
  scale: number;
  height: number;
  radius: number;
  animations: { [estado: string]: string };
}

export interface WeaponConfig {
  model: string;
  socket: string;
  scale: number;
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  offset?: [number, number, number];
  rotation?: [number, number, number];
}

export interface EnvironmentConfig {
  model: string;
  scale: number;
  instanced: boolean;
  collisionRadius: number;
}

export interface TerrainConfig {
  chunkSize: number;
  segments: number;
  materials: {
    [nombre: string]: {
      albedoMap?: string;
      normalMap?: string;
      roughnessMap?: string;
      aoMap?: string;
      roughness: number;
      metalness: number;
    };
  };
}

export interface LightingConfig {
  skyColor: string;
  groundColor: string;
  hemisphereIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
}

export interface GraphicsConfig {
  shadowMapType: string;
  shadowMapResolution: number;
  toneMapping: string;
  toneMappingExposure: number;
  outputColorSpace: string;
  pixelRatioMax: number;
}

export class ConfigManager {
  private static instancia: ConfigManager | null = null;

  players: { [id: string]: PlayerConfig } = {};
  weapons: { [id: string]: WeaponConfig } = {};
  environment: { [id: string]: EnvironmentConfig } = {};
  terrain: TerrainConfig | null = null;
  lighting: LightingConfig | null = null;
  graphics: GraphicsConfig | null = null;

  private cargado = false;

  static getInstancia(): ConfigManager {
    if (!ConfigManager.instancia) {
      ConfigManager.instancia = new ConfigManager();
    }
    return ConfigManager.instancia;
  }

  async cargar(): Promise<void> {
    if (this.cargado) return;
    try {
      const [players, weapons, environment, terrain, lighting, graphics] = await Promise.all([
        this.cargarJson<{ [id: string]: PlayerConfig }>('assets/config/players.json'),
        this.cargarJson<{ [id: string]: WeaponConfig }>('assets/config/weapons.json'),
        this.cargarJson<{ [id: string]: EnvironmentConfig }>('assets/config/environment.json'),
        this.cargarJson<TerrainConfig>('assets/config/terrain.json'),
        this.cargarJson<LightingConfig>('assets/config/lighting.json'),
        this.cargarJson<GraphicsConfig>('assets/config/graphics.json'),
      ]);

      if (players) this.players = players;
      if (weapons) this.weapons = weapons;
      if (environment) this.environment = environment;
      if (terrain) this.terrain = terrain;
      if (lighting) this.lighting = lighting;
      if (graphics) this.graphics = graphics;

      this.cargado = true;
    } catch (e) {
      console.warn('[ConfigManager] Error al cargar archivos de configuracion JSON:', e);
    }
  }

  private async cargarJson<T>(url: string): Promise<T | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[ConfigManager] No se pudo cargar el archivo de configuracion '${url}' (Status: ${resp.status})`);
        return null;
      }
      return (await resp.json()) as T;
    } catch {
      console.warn(`[ConfigManager] Excepcion al descargar '${url}'`);
      return null;
    }
  }
}
