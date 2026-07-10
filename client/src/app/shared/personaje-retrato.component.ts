import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { especificacionDe, hexCss, Personaje } from '../models/personajes';

/**
 * Retrato SVG inline de un personaje (arte 100% vectorial en codigo, cero assets de imagen —
 * decision confirmada). Rasgos distintivos por especie via `@switch`; el contorno 3px
 * `#111424` es la firma visual compartida con los chibis del canvas (`render/dibujo-chibi.ts`,
 * B4) aunque ambos dibujos son implementaciones independientes (DOM vs PixiJS).
 */
@Component({
  selector: 'app-personaje-retrato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 64 64" [attr.width]="tamano()" [attr.height]="tamano()" role="img" [attr.aria-label]="nombre()">
      @switch (personaje()) {
        @case ('GATO') {
          <path d="M14 20 L22 3 L28 20 Z" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
          <path d="M50 20 L42 3 L36 20 Z" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
          <circle cx="32" cy="36" r="22" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" />
          <line x1="5" y1="33" x2="20" y2="36" stroke="#111424" stroke-width="2" stroke-linecap="round" />
          <line x1="5" y1="40" x2="20" y2="40" stroke="#111424" stroke-width="2" stroke-linecap="round" />
          <line x1="59" y1="33" x2="44" y2="36" stroke="#111424" stroke-width="2" stroke-linecap="round" />
          <line x1="59" y1="40" x2="44" y2="40" stroke="#111424" stroke-width="2" stroke-linecap="round" />
          <circle cx="25" cy="34" r="3" fill="#111424" />
          <circle cx="39" cy="34" r="3" fill="#111424" />
        }
        @case ('DINO') {
          <circle cx="32" cy="38" r="22" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" />
          <path d="M20 17 L25 6 L29 17 Z M28 15 L33 3 L37 15 Z M36 17 L40 6 L44 17 Z"
                [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="2.5" stroke-linejoin="round" />
          <ellipse cx="32" cy="48" rx="12" ry="8" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
          <circle cx="24" cy="36" r="3" fill="#111424" />
          <circle cx="40" cy="36" r="3" fill="#111424" />
        }
        @case ('ROBO_PERRO') {
          <line x1="32" y1="10" x2="32" y2="2" stroke="#111424" stroke-width="3" stroke-linecap="round" />
          <circle cx="32" cy="2" r="3" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
          <path d="M12 24 L20 10 L26 24 Z M38 24 L44 10 L52 24 Z"
                [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
          <circle cx="32" cy="36" r="22" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" />
          <rect x="18" y="30" width="28" height="9" rx="4" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
        }
        @case ('CONEJO') {
          <rect x="15" y="2" width="9" height="26" rx="4.5" [attr.fill]="colorCuerpo()" stroke="#111424"
                stroke-width="3" transform="rotate(-8 19.5 15)" />
          <rect x="40" y="2" width="9" height="26" rx="4.5" [attr.fill]="colorCuerpo()" stroke="#111424"
                stroke-width="3" transform="rotate(8 44.5 15)" />
          <circle cx="32" cy="38" r="22" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" />
          <circle cx="24" cy="36" r="3" fill="#111424" />
          <circle cx="40" cy="36" r="3" fill="#111424" />
          <rect x="28" y="46" width="4" height="6" rx="1" fill="white" stroke="#111424" stroke-width="1.5" />
          <rect x="33" y="46" width="4" height="6" rx="1" fill="white" stroke="#111424" stroke-width="1.5" />
        }
        @case ('ARDILLA') {
          <path d="M44 44 C 60 40, 60 12, 40 8 C 54 20, 52 38, 40 46 Z"
                [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
          <circle cx="30" cy="36" r="20" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" />
          <circle cx="23" cy="34" r="3" fill="#111424" />
          <circle cx="37" cy="34" r="3" fill="#111424" />
        }
      }
    </svg>
  `,
})
export class PersonajeRetratoComponent {
  readonly personaje = input.required<Personaje>();
  readonly tamano = input<number>(64);

  protected readonly nombre = computed(() => especificacionDe(this.personaje()).nombre);
  protected readonly colorCuerpo = computed(() => hexCss(especificacionDe(this.personaje()).colorCuerpo));
  protected readonly colorDetalle = computed(() => hexCss(especificacionDe(this.personaje()).colorDetalle));
}
