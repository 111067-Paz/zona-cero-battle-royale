import { Color, ShaderMaterial } from 'three';

export class WaterShader {
  static createWaterMaterial(colorBase = 0x38bdf8): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(colorBase) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z += sin(pos.x * 2.0 + uTime * 3.0) * 0.05;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(uColor, 0.85);
        }
      `,
      transparent: true,
    });
  }
}
