import { DataTexture, NearestFilter, RedFormat, Sprite, SpriteMaterial, CanvasTexture, Vector3 } from 'three';

/**
 * Convencion de coordenadas UNICA para todo `render/tres/*` (Decision de arquitectura #1): mundo
 * `(x,y)` -> three `(x, altura, y)`. El eje `y` de mundo se convierte en `z` de three; `+Y` de
 * three es "arriba". Nunca construir un `Vector3` a mano fuera de este archivo con otro orden.
 */
export function aVector3(xMundo: number, yMundo: number, altura = 0): Vector3 {
  return new Vector3(xMundo, altura, yMundo);
}

/** Vector unitario de mundo (ya en ejes three) para un `angulo` en radianes: three `(cos a, 0, sin a)`. */
export function direccionDesdeAngulo(angulo: number): Vector3 {
  return new Vector3(Math.cos(angulo), 0, Math.sin(angulo));
}

/**
 * Gradiente de 3 pasos para `MeshToonMaterial.gradientMap` (estilo cartoon, Decision #5). Generado
 * en codigo (DataTexture) — cero assets de imagen, coherente con la decision de arte del proyecto.
 */
export function crearGradienteToon(): DataTexture {
  const datos = new Uint8Array([90, 165, 255]);
  const textura = new DataTexture(datos, 3, 1, RedFormat);
  textura.minFilter = NearestFilter;
  textura.magFilter = NearestFilter;
  textura.generateMipmaps = false;
  textura.needsUpdate = true;
  return textura;
}

export interface SpriteCanvas {
  readonly sprite: Sprite;
  /** Vuelve a dibujar sobre el canvas interno y sube la textura — llamar SOLO cuando el contenido cambia. */
  redibujar(dibujar: (ctx: CanvasRenderingContext2D, anchoPx: number, altoPx: number) => void): void;
  dispose(): void;
}

/**
 * Sprite billboard respaldado por un `<canvas>` 2D (CanvasTexture): base de las barras de HP y los
 * numeros de dano flotantes (B3/B5). `escalaMundo` fija el tamano visible en unidades de mundo;
 * la resolucion del canvas (`anchoPx`/`altoPx`) es independiente y solo afecta nitidez.
 */
export function crearSpriteCanvas(anchoPx: number, altoPx: number, escalaMundo: { x: number; y: number }): SpriteCanvas {
  const canvas = document.createElement('canvas');
  canvas.width = anchoPx;
  canvas.height = altoPx;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('No se pudo obtener el contexto 2d del canvas del sprite');
  }
  const textura = new CanvasTexture(canvas);
  const material = new SpriteMaterial({ map: textura, transparent: true, depthWrite: false });
  const sprite = new Sprite(material);
  sprite.scale.set(escalaMundo.x, escalaMundo.y, 1);

  return {
    sprite,
    redibujar(dibujar): void {
      ctx.clearRect(0, 0, anchoPx, altoPx);
      dibujar(ctx, anchoPx, altoPx);
      textura.needsUpdate = true;
    },
    dispose(): void {
      textura.dispose();
      material.dispose();
    },
  };
}
