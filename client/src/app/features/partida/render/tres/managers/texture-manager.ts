import { Texture, TextureLoader } from 'three';

export class TextureManager {
  private readonly loader = new TextureLoader();
  private readonly cacheTexturas = new Map<string, Texture>();

  async cargarTextura(url: string): Promise<Texture | null> {
    if (!url) return null;
    if (this.cacheTexturas.has(url)) {
      return this.cacheTexturas.get(url)!;
    }

    try {
      const textura = await new Promise<Texture>((resolve, reject) => {
        this.loader.load(
          url,
          (tex) => resolve(tex),
          undefined,
          (err) => reject(err),
        );
      });

      this.cacheTexturas.set(url, textura);
      return textura;
    } catch {
      console.warn(`[TextureManager] Textura PBR no encontrada: '${url}'`);
      return null;
    }
  }

  limpiar(): void {
    this.cacheTexturas.forEach((t) => t.dispose());
    this.cacheTexturas.clear();
  }
}
