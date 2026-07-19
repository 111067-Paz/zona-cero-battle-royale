import { AudioListener } from 'three';

export class AudioManager {
  readonly listener = new AudioListener();
  private readonly cacheSonidos = new Map<string, AudioBuffer>();

  async cargarAudio(url: string): Promise<AudioBuffer | null> {
    if (this.cacheSonidos.has(url)) {
      return this.cacheSonidos.get(url)!;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[AudioManager] Sonido no encontrado: '${url}'`);
        return null;
      }
      const buffer = await resp.arrayBuffer();
      const audioBuffer = await this.listener.context.decodeAudioData(buffer);
      this.cacheSonidos.set(url, audioBuffer);
      return audioBuffer;
    } catch {
      console.warn(`[AudioManager] Error al procesar audio: '${url}'`);
      return null;
    }
  }

  limpiar(): void {
    this.cacheSonidos.clear();
  }
}
