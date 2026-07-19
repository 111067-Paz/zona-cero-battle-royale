import { Color, ShaderMaterial } from 'three';

export class OutlineShader {
  static createOutlineMaterial(colorOutline = 0xfacc15): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(colorOutline) },
      },
      vertexShader: `
        void main() {
          vec3 pos = position + normal * 0.04;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      side: 1, // BackSide
    });
  }
}
