import { Graphics } from 'pixi.js';
import { especificacionDe, Personaje } from '../../../models/personajes';

const COLOR_BORDE = 0x111424;
const COLOR_MUERTO_CUERPO = 0x8a8f9c;
const COLOR_MUERTO_DETALLE = 0xc7cbd4;
const COLOR_ANILLO_PROPIO = 0xffcc00;
const GROSOR_BORDE = 3;
const GROSOR_DETALLE = 2;

export interface OpcionesChibi {
  muerto: boolean;
  propio: boolean;
}

/**
 * Dibuja el cuerpo de un personaje en coordenadas de PANTALLA (cx,cy = centro del circulo del
 * cuerpo), compartido entre el renderer 2D y el isometrico (Decision de arquitectura #6): cada
 * renderer resuelve su propia proyeccion mundo->pantalla y llama a esta funcion con el centro ya
 * proyectado — la silueta es identica en ambas vistas. Mira/sombra/HP quedan en cada renderer
 * porque dependen de la proyeccion (angulo iso vs. angulo plano, elipse vs. circulo).
 *
 * <p>Jugador propio: anillo exterior dorado — la unica senal de "este soy yo" ahora que el color
 * del cuerpo lo define el personaje (ya no verde/rosa fijo). Muerto: paleta gris conservando la
 * silueta completa (mismos rasgos, mismo contorno), para que siga siendo reconocible en el suelo.
 */
export function dibujarChibi(
  g: Graphics,
  cx: number,
  cy: number,
  radioPx: number,
  personaje: Personaje,
  opciones: OpcionesChibi,
): void {
  const especificacion = especificacionDe(personaje);
  const colorCuerpo = opciones.muerto ? COLOR_MUERTO_CUERPO : especificacion.colorCuerpo;
  const colorDetalle = opciones.muerto ? COLOR_MUERTO_DETALLE : especificacion.colorDetalle;

  if (opciones.propio) {
    g.circle(cx, cy, radioPx + 5).stroke({ width: GROSOR_BORDE, color: COLOR_ANILLO_PROPIO });
  }

  dibujarRasgoTrasero(g, cx, cy, radioPx, personaje, colorDetalle);

  g.circle(cx, cy, radioPx).fill(colorCuerpo).stroke({ width: GROSOR_BORDE, color: COLOR_BORDE });

  dibujarRasgoFrontal(g, cx, cy, radioPx, personaje, colorCuerpo, colorDetalle);
}

/** Rasgos que van DETRAS del circulo del cuerpo (se pintan primero). Solo la ardilla los usa. */
function dibujarRasgoTrasero(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  personaje: Personaje,
  colorDetalle: number,
): void {
  if (personaje !== 'ARDILLA') {
    return;
  }
  // Cola en arco, apoyada sobre el hombro derecho y curvando hacia arriba por detras.
  g.moveTo(cx + r * 0.3, cy + r * 0.3)
    .quadraticCurveTo(cx + r * 2.1, cy, cx + r * 0.5, cy - r * 1.7)
    .quadraticCurveTo(cx + r * 1.4, cy - r * 0.5, cx + r * 0.1, cy - r * 0.1)
    .closePath()
    .fill(colorDetalle)
    .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
}

/** Rasgos que van SOBRE el circulo del cuerpo (se pintan al final). */
function dibujarRasgoFrontal(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  personaje: Personaje,
  colorCuerpo: number,
  colorDetalle: number,
): void {
  switch (personaje) {
    case 'GATO':
      // Orejas triangulares + bigotes.
      g.poly([cx - r * 0.7, cy - r * 0.5, cx - r * 0.9, cy - r * 1.6, cx - r * 0.1, cy - r * 0.9])
        .fill(colorCuerpo)
        .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
      g.poly([cx + r * 0.7, cy - r * 0.5, cx + r * 0.9, cy - r * 1.6, cx + r * 0.1, cy - r * 0.9])
        .fill(colorCuerpo)
        .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
      g.moveTo(cx - r * 1.6, cy - r * 0.1).lineTo(cx - r * 0.5, cy + r * 0.1)
        .stroke({ width: 1.5, color: COLOR_BORDE });
      g.moveTo(cx - r * 1.6, cy + r * 0.4).lineTo(cx - r * 0.5, cy + r * 0.4)
        .stroke({ width: 1.5, color: COLOR_BORDE });
      g.moveTo(cx + r * 1.6, cy - r * 0.1).lineTo(cx + r * 0.5, cy + r * 0.1)
        .stroke({ width: 1.5, color: COLOR_BORDE });
      g.moveTo(cx + r * 1.6, cy + r * 0.4).lineTo(cx + r * 0.5, cy + r * 0.4)
        .stroke({ width: 1.5, color: COLOR_BORDE });
      return;
    case 'DINO':
      // Fila de puas arriba + panza clara abajo.
      g.poly([
        cx - r * 0.6, cy - r * 0.7, cx - r * 0.35, cy - r * 1.5, cx - r * 0.1, cy - r * 0.7,
        cx + r * 0.15, cy - r * 1.6, cx + r * 0.4, cy - r * 0.7, cx + r * 0.65, cy - r * 1.5,
        cx + r * 0.9, cy - r * 0.7,
      ])
        .fill(colorCuerpo)
        .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
      g.ellipse(cx, cy + r * 0.5, r * 0.65, r * 0.4)
        .fill(colorDetalle)
        .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
      return;
    case 'ROBO_PERRO':
      // Antena + visor.
      g.moveTo(cx, cy - r).lineTo(cx, cy - r * 1.8)
        .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
      g.circle(cx, cy - r * 1.8, r * 0.2).fill(colorDetalle).stroke({ width: 1.5, color: COLOR_BORDE });
      g.rect(cx - r * 0.75, cy - r * 0.25, r * 1.5, r * 0.5)
        .fill(colorDetalle)
        .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
      return;
    case 'CONEJO': {
      // Orejas largas + dientes.
      const anguloOrejaIzq = -0.35;
      const anguloOrejaDer = 0.35;
      dibujarOrejaLarga(g, cx, cy, r, anguloOrejaIzq, colorCuerpo);
      dibujarOrejaLarga(g, cx, cy, r, anguloOrejaDer, colorCuerpo);
      g.rect(cx - r * 0.25, cy + r * 0.45, r * 0.2, r * 0.35).fill(0xffffff).stroke({ width: 1, color: COLOR_BORDE });
      g.rect(cx + r * 0.05, cy + r * 0.45, r * 0.2, r * 0.35).fill(0xffffff).stroke({ width: 1, color: COLOR_BORDE });
      return;
    }
    case 'ARDILLA':
      // La cola ya se dibujo detras del cuerpo; sin rasgo frontal adicional.
      return;
    default: {
      const exhaustivo: never = personaje;
      throw new Error(`Personaje sin dibujo: ${exhaustivo}`);
    }
  }
}

function dibujarOrejaLarga(g: Graphics, cx: number, cy: number, r: number, angulo: number, color: number): void {
  const largo = r * 1.9;
  const ancho = r * 0.5;
  const baseX = cx + Math.sin(angulo) * ancho * 0.6;
  const baseY = cy - r * 0.9;
  const puntaX = baseX + Math.sin(angulo) * largo;
  const puntaY = baseY - Math.cos(angulo) * largo;
  const perpX = Math.cos(angulo) * (ancho / 2);
  const perpY = Math.sin(angulo) * (ancho / 2);
  g.poly([
    baseX - perpX, baseY - perpY,
    baseX + perpX, baseY + perpY,
    puntaX, puntaY,
  ])
    .fill(color)
    .stroke({ width: GROSOR_DETALLE, color: COLOR_BORDE });
}
