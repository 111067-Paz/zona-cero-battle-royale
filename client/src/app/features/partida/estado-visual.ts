import { EstadoPartida, EstadoVida } from '../../models/protocolo';
import { Personaje } from '../../models/personajes';

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
  personaje: Personaje;
  arma: string;
}

export interface ProyectilVisual {
  id: number;
  x: number;
  y: number;
  angulo: number;
}

export interface ZonaVisual {
  cx: number;
  cy: number;
  radio: number;
  radioProximo: number;
}

export interface BotinVisual {
  id: number;
  tipo: string;
  x: number;
  y: number;
}

/** Numero de dano flotante, derivado del diff de HP entre snapshots (R29). Lo anima el renderer. */
export interface NumeroDanio {
  x: number;
  y: number;
  cantidad: number;
  creadoEn: number;
}

export interface EstadoVisual {
  tick: number;
  estado: EstadoPartida;
  jugadores: JugadorVisual[];
  proyectiles: ProyectilVisual[];
  numerosDanio: NumeroDanio[];
  zona: ZonaVisual | null;
  botines: BotinVisual[];
}

/** Linea del kill feed, derivada de un EVENTO KILL. */
export interface LineaKill {
  asesino: string;
  victima: string;
  arma: string;
  creadoEn: number;
}

/** Podio, derivado del EVENTO FIN_PARTIDA (§7-F). */
export interface ResultadoPartida {
  ganador: string;
  killsPorJugador: Record<string, number>;
}
