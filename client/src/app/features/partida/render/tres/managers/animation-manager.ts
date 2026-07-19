import { AnimationAction, AnimationClip, AnimationMixer, Object3D } from 'three';

export class AnimationManager {
  private readonly mixer: AnimationMixer;
  private readonly acciones = new Map<string, AnimationAction>();
  private accionActual: AnimationAction | null = null;

  constructor(raiz: Object3D, clips: AnimationClip[]) {
    this.mixer = new AnimationMixer(raiz);
    for (const clip of clips) {
      const accion = this.mixer.clipAction(clip);
      this.acciones.set(clip.name.toLowerCase(), accion);
    }
  }

  reproducir(nombreAnimacion: string, duracionTransicionSec = 0.2): void {
    const clave = nombreAnimacion.toLowerCase();
    const nuevaAccion = this.acciones.get(clave);

    if (!nuevaAccion) {
      // Si el clip de animación no existe en el GLB, no rompe la ejecución
      return;
    }

    if (this.accionActual === nuevaAccion) return;

    if (this.accionActual) {
      this.accionActual.fadeOut(duracionTransicionSec);
    }

    nuevaAccion.reset().fadeIn(duracionTransicionSec).play();
    this.accionActual = nuevaAccion;
  }

  actualizar(deltaSec: number): void {
    this.mixer.update(deltaSec);
  }

  destruir(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
    this.acciones.clear();
  }
}
