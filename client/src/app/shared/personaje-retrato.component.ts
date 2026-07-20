import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { especificacionDe, hexCss, Personaje, rutaRetrato } from '../models/personajes';

@Component({
  selector: 'app-personaje-retrato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .retrato-img {
        display: block;
        object-fit: cover;
      }
    `,
  ],
  template: `
    @if (!imagenFallo()) {
      <img
        [src]="ruta()"
        [width]="tamano()"
        [height]="tamano()"
        [alt]="nombre()"
        (error)="imagenFallo.set(true)"
        class="retrato-img rounded-full"
      />
    } @else {
      <svg viewBox="0 0 64 64" [attr.width]="tamano()" [attr.height]="tamano()" role="img" [attr.aria-label]="nombre()">
        <defs>
          <radialGradient [attr.id]="'grad-' + idInstancia" cx="36%" cy="30%" r="75%">
            <stop offset="0%" [attr.stop-color]="colorCuerpoClaro()" />
            <stop offset="100%" [attr.stop-color]="colorCuerpo()" />
          </radialGradient>
          <radialGradient [attr.id]="'bg-grad-' + idInstancia" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </radialGradient>
        </defs>

        <circle cx="32" cy="32" r="30" [attr.fill]="'url(#bg-grad-' + idInstancia + ')'" stroke="#111424" stroke-width="2.5" />

        @switch (personaje()) {
          @case ('TIBURON') {
            <path d="M32 6 C24 16, 24 24, 32 24 Z" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="2.5" />
            <circle cx="32" cy="38" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
            <path d="M12 36 Q32 22 52 36 Z" [attr.fill]="colorDetalle()" opacity="0.4" />
            <circle cx="24" cy="34" r="3.4" fill="#111424" />
            <circle cx="40" cy="34" r="3.4" fill="#111424" />
            <circle cx="25.2" cy="32.8" r="1.1" fill="#ffffff" />
            <circle cx="41.2" cy="32.8" r="1.1" fill="#ffffff" />
            <path d="M22 44 Q32 40 42 44" stroke="#111424" stroke-width="2" fill="none" />
          }
          @case ('SHARK') {
            <path d="M26 4 C18 16, 20 22, 30 22 Z" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="2.5" />
            <circle cx="32" cy="38" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
            <ellipse cx="32" cy="46" rx="10" ry="6" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
            <circle cx="24" cy="34" r="3.4" fill="#111424" />
            <circle cx="40" cy="34" r="3.4" fill="#111424" />
            <circle cx="25.2" cy="32.8" r="1.1" fill="#ffffff" />
            <circle cx="41.2" cy="32.8" r="1.1" fill="#ffffff" />
          }
          @case ('MAKO') {
            <circle cx="32" cy="36" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
            <line x1="14" y1="26" x2="48" y2="40" stroke="#111424" stroke-width="3" />
            <circle cx="24" cy="34" r="4.5" fill="#111424" />
            <circle cx="40" cy="34" r="3.4" fill="#111424" />
            <circle cx="41.2" cy="32.8" r="1.1" fill="#ffffff" />
          }
          @case ('GATO') {
            <path d="M14 20 L22 3 L28 20 Z" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
            <path d="M50 20 L42 3 L36 20 Z" [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
            <path d="M17 17 L21 8 L25 17 Z" [attr.fill]="colorDetalle()" />
            <path d="M47 17 L43 8 L39 17 Z" [attr.fill]="colorDetalle()" />
            <circle cx="32" cy="36" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
            <line x1="5" y1="33" x2="20" y2="36" stroke="#111424" stroke-width="2" stroke-linecap="round" />
            <line x1="5" y1="40" x2="20" y2="40" stroke="#111424" stroke-width="2" stroke-linecap="round" />
            <line x1="59" y1="33" x2="44" y2="36" stroke="#111424" stroke-width="2" stroke-linecap="round" />
            <line x1="59" y1="40" x2="44" y2="40" stroke="#111424" stroke-width="2" stroke-linecap="round" />
            <ellipse cx="20" cy="42" rx="4" ry="2.5" [attr.fill]="colorMejilla()" opacity="0.6" />
            <ellipse cx="44" cy="42" rx="4" ry="2.5" [attr.fill]="colorMejilla()" opacity="0.6" />
            <circle cx="25" cy="34" r="3.4" fill="#111424" />
            <circle cx="39" cy="34" r="3.4" fill="#111424" />
            <circle cx="26.2" cy="32.8" r="1.1" fill="#ffffff" />
            <circle cx="40.2" cy="32.8" r="1.1" fill="#ffffff" />
            <path d="M30 39 Q32 41 34 39" stroke="#111424" stroke-width="1.5" fill="none" stroke-linecap="round" />
          }
          @default {
            <circle cx="32" cy="36" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
            <circle cx="24" cy="32" r="3.4" fill="#111424" />
            <circle cx="40" cy="32" r="3.4" fill="#111424" />
            <circle cx="25.2" cy="30.8" r="1.1" fill="#ffffff" />
            <circle cx="41.2" cy="30.8" r="1.1" fill="#ffffff" />
            <path d="M28 42 Q32 46 36 42" stroke="#111424" stroke-width="2" fill="none" stroke-linecap="round" />
          }
        }
      </svg>
    }
  `,
})
export class PersonajeRetratoComponent {
  private static contadorInstancias = 0;

  readonly personaje = input.required<Personaje>();
  readonly tamano = input<number>(64);

  protected readonly idInstancia = `pr${PersonajeRetratoComponent.contadorInstancias++}`;

  protected readonly imagenFallo = linkedSignal({ source: this.personaje, computation: () => false });
  protected readonly ruta = computed(() => rutaRetrato(this.personaje()));
  protected readonly nombre = computed(() => especificacionDe(this.personaje()).nombre);
  protected readonly colorCuerpo = computed(() => hexCss(especificacionDe(this.personaje()).colorCuerpo));
  protected readonly colorDetalle = computed(() => hexCss(especificacionDe(this.personaje()).colorDetalle));
  protected readonly colorCuerpoClaro = computed(() => this.aclarar(especificacionDe(this.personaje()).colorCuerpo, 0.4));
  protected readonly colorMejilla = computed(() => this.aclarar(especificacionDe(this.personaje()).colorDetalle, -0.3));

  private aclarar(color: number, factor: number): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const destino = factor >= 0 ? 255 : 0;
    const magnitud = Math.abs(factor);
    const nr = Math.round(r + (destino - r) * magnitud);
    const ng = Math.round(g + (destino - g) * magnitud);
    const nb = Math.round(b + (destino - b) * magnitud);
    return hexCss((nr << 16) | (ng << 8) | nb);
  }
}
