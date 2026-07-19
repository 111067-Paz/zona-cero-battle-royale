import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { especificacionDe, hexCss, Personaje, rutaRetrato } from '../models/personajes';

/**
 * Retrato de un personaje: PNG de `public/personajes/` (calidad de render, los archivos los provee
 * el usuario — decision confirmada en la fase de rediseno visual) con FALLBACK automatico al SVG
 * vectorial si el archivo falta (`(error)` del `<img>`; el 404 en consola es esperado e inocuo).
 *
 * <p>El SVG (mientras no haya PNG) apunta a leer como un "sticker" de mascota: insignia circular
 * de color por especie detras, cabeza con degrade glossy, ojos grandes con brillo y mejillas — la
 * misma firma de contorno 3px `#111424` que los chibis del canvas. Los degrades usan un ID unico
 * por INSTANCIA (`idInstancia`): con roster de 10 retratos en pantalla a la vez, un `id` fijo en
 * el template haria que todos apunten al primer `<radialGradient>` del DOM.
 */
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
        class="retrato-img"
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
        @case ('DINO') {
          <circle cx="32" cy="38" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
          <path d="M20 17 L25 6 L29 17 Z M28 15 L33 3 L37 15 Z M36 17 L40 6 L44 17 Z"
                [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="2.5" stroke-linejoin="round" />
          <ellipse cx="32" cy="48" rx="12" ry="8" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
          <ellipse cx="21" cy="41" rx="3.5" ry="2.3" [attr.fill]="colorMejilla()" opacity="0.6" />
          <ellipse cx="43" cy="41" rx="3.5" ry="2.3" [attr.fill]="colorMejilla()" opacity="0.6" />
          <circle cx="24" cy="36" r="3.4" fill="#111424" />
          <circle cx="40" cy="36" r="3.4" fill="#111424" />
          <circle cx="25.2" cy="34.8" r="1.1" fill="#ffffff" />
          <circle cx="41.2" cy="34.8" r="1.1" fill="#ffffff" />
          <circle cx="28" cy="44" r="0.9" fill="#111424" opacity="0.5" />
          <circle cx="36" cy="44" r="0.9" fill="#111424" opacity="0.5" />
        }
        @case ('ROBO_PERRO') {
          <line x1="32" y1="10" x2="32" y2="2" stroke="#111424" stroke-width="3" stroke-linecap="round" />
          <circle cx="32" cy="2" r="3" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
          <path d="M12 24 L20 10 L26 24 Z M38 24 L44 10 L52 24 Z"
                [attr.fill]="colorCuerpo()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
          <circle cx="32" cy="36" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
          <rect x="18" y="29" width="28" height="11" rx="4.5" [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="2" />
          <line x1="21" y1="34.5" x2="43" y2="34.5" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />
          <circle cx="25" cy="34.5" r="2.6" fill="#111424" />
          <circle cx="39" cy="34.5" r="2.6" fill="#111424" />
          <circle cx="26" cy="33.5" r="0.9" fill="#7bdfe8" />
          <circle cx="40" cy="33.5" r="0.9" fill="#7bdfe8" />
          <rect x="14" y="44" width="4" height="3" rx="1" [attr.fill]="colorDetalle()" opacity="0.7" />
          <rect x="46" y="44" width="4" height="3" rx="1" [attr.fill]="colorDetalle()" opacity="0.7" />
        }
        @case ('CONEJO') {
          <rect x="15" y="2" width="9" height="26" rx="4.5" [attr.fill]="colorCuerpo()" stroke="#111424"
                stroke-width="3" transform="rotate(-8 19.5 15)" />
          <rect x="40" y="2" width="9" height="26" rx="4.5" [attr.fill]="colorCuerpo()" stroke="#111424"
                stroke-width="3" transform="rotate(8 44.5 15)" />
          <rect x="17.5" y="6" width="4" height="18" rx="2" [attr.fill]="colorMejilla()" opacity="0.5" transform="rotate(-8 19.5 15)" />
          <rect x="42.5" y="6" width="4" height="18" rx="2" [attr.fill]="colorMejilla()" opacity="0.5" transform="rotate(8 44.5 15)" />
          <circle cx="32" cy="38" r="22" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
          <ellipse cx="22" cy="44" rx="4" ry="2.5" [attr.fill]="colorMejilla()" opacity="0.6" />
          <ellipse cx="42" cy="44" rx="4" ry="2.5" [attr.fill]="colorMejilla()" opacity="0.6" />
          <circle cx="24" cy="36" r="3.4" fill="#111424" />
          <circle cx="40" cy="36" r="3.4" fill="#111424" />
          <circle cx="25.2" cy="34.8" r="1.1" fill="#ffffff" />
          <circle cx="41.2" cy="34.8" r="1.1" fill="#ffffff" />
          <rect x="28" y="46" width="4" height="6" rx="1" fill="white" stroke="#111424" stroke-width="1.5" />
          <rect x="33" y="46" width="4" height="6" rx="1" fill="white" stroke="#111424" stroke-width="1.5" />
        }
        @case ('ARDILLA') {
          <path d="M44 44 C 60 40, 60 12, 40 8 C 54 20, 52 38, 40 46 Z"
                [attr.fill]="colorDetalle()" stroke="#111424" stroke-width="3" stroke-linejoin="round" />
          <circle cx="30" cy="36" r="20" [attr.fill]="'url(#grad-' + idInstancia + ')'" stroke="#111424" stroke-width="3" />
          <ellipse cx="20" cy="41" rx="3.5" ry="2.3" [attr.fill]="colorMejilla()" opacity="0.6" />
          <ellipse cx="40" cy="41" rx="3.5" ry="2.3" [attr.fill]="colorMejilla()" opacity="0.6" />
          <circle cx="23" cy="34" r="3.4" fill="#111424" />
          <circle cx="37" cy="34" r="3.4" fill="#111424" />
          <circle cx="24.2" cy="32.8" r="1.1" fill="#ffffff" />
          <circle cx="38.2" cy="32.8" r="1.1" fill="#ffffff" />
          <ellipse cx="30" cy="40" rx="1.6" ry="1.2" fill="#111424" opacity="0.6" />
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

  /** Sufijo unico para los ids de `<radialGradient>` — evita colisiones con muchos retratos a la vez (roster, ranking). */
  protected readonly idInstancia = `pr${PersonajeRetratoComponent.contadorInstancias++}`;

  /** Se resetea solo al cambiar el personaje (el podio reusa la instancia con otro personaje). */
  protected readonly imagenFallo = linkedSignal({ source: this.personaje, computation: () => true });
  protected readonly ruta = computed(() => rutaRetrato(this.personaje()));
  protected readonly nombre = computed(() => especificacionDe(this.personaje()).nombre);
  protected readonly colorCuerpo = computed(() => hexCss(especificacionDe(this.personaje()).colorCuerpo));
  protected readonly colorDetalle = computed(() => hexCss(especificacionDe(this.personaje()).colorDetalle));
  /** Tope claro del degrade "glossy" de la cabeza. */
  protected readonly colorCuerpoClaro = computed(() => this.aclarar(especificacionDe(this.personaje()).colorCuerpo, 0.4));
  /** Mejillas: version mas oscura del tono de detalle, para que se note sobre el degrade claro. */
  protected readonly colorMejilla = computed(() => this.aclarar(especificacionDe(this.personaje()).colorDetalle, -0.3));

  /** Interpola un color numerico hacia blanco (factor > 0) o negro (factor < 0) y lo devuelve como `#rrggbb`. */
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
