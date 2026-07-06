import { EstadoPartida, EstadoVida } from '../../models/protocolo';

/**
 * Estado listo para dibujar: posiciones YA interpoladas en coordenadas de mundo. Es lo que consume
 * el renderer, que no conoce snapshots ni interpolacion — solo recibe esto y dibuja.
 */
export interface JugadorVisual {
  id: string;
  x: number;
  y: number;
  angulo: number;
  hp: number;
  estadoVida: EstadoVida;
  conectado: boolean;
}

export interface EstadoVisual {
  tick: number;
  estado: EstadoPartida;
  jugadores: JugadorVisual[];
}
