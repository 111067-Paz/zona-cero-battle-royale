/**
 * Tipos del protocolo v1 (PLAN §5). Espejo EXACTO de los fixtures en `contratos/fixtures/*.json` y
 * de los DTOs Java. Union discriminada por `tipo` para que los `switch` del cliente sean exhaustivos
 * (TypeScript obliga a cubrir todos los casos). Cero `any`.
 */

import type { Personaje } from './personajes';

export const VERSION_PROTOCOLO = 1 as const;
export type Version = typeof VERSION_PROTOCOLO;

export type AccionJugador = 'RECOGER' | 'USAR_BOTIQUIN';
export type EstadoVida = 'VIVO' | 'MUERTO';
export type EstadoPartida = 'EN_LOBBY' | 'CUENTA_REGRESIVA' | 'EN_CURSO' | 'FINALIZADA';
export type TipoArma = 'PISTOLA' | 'ESCOPETA' | 'RIFLE';

export interface VectorMensaje {
  x: number;
  y: number;
}

// ---------- Cliente -> servidor ----------

export interface Unirse {
  v: Version;
  tipo: 'UNIRSE';
  ticket: string | null;
}

export interface Input {
  v: Version;
  tipo: 'INPUT';
  /** Secuencia monotonica por conexion (arranca en 1). */
  sec: number;
  mover: VectorMensaje;
  /** Angulo de apuntado en radianes. */
  apuntar: number;
  disparar: boolean;
  acciones: AccionJugador[];
}

export interface Salir {
  v: Version;
  tipo: 'SALIR';
}

export type MensajeCliente = Unirse | Input | Salir;

// ---------- Servidor -> cliente ----------

export interface ConfigBienvenida {
  tickRate: number;
  snapshotRate: number;
  mundo: number;
  velocidad: number;
  /** Radio de colision del jugador (F7): la prediccion client-side corre la MISMA resolucion. */
  radioJugador: number;
}

export interface Bienvenida {
  v: Version;
  tipo: 'BIENVENIDA';
  idJugador: string;
  idPartida: string;
  config: ConfigBienvenida;
  idMapa: string;
}

export interface JugadorSnapshot {
  id: string;
  x: number;
  y: number;
  /** Angulo en radianes. */
  angulo: number;
  hp: number;
  estadoVida: EstadoVida;
  conectado: boolean;
  arma: TipoArma;
  kills: number;
  /** Botiquines en inventario (0-3, R28), para el quick-slot del HUD. */
  botiquines: number;
  personaje: Personaje;
}

export interface ProyectilSnapshot {
  /** idRed monotonico, jamas reciclado (R2). El cliente interpola por este id. */
  id: number;
  x: number;
  y: number;
  angulo: number;
}

export interface ZonaSnapshot {
  cx: number;
  cy: number;
  radio: number;
  fase: number;
  /** Radio al que se dirige la contraccion en curso, o la proxima si esta en espera. */
  radioProximo: number;
  /** Ticks restantes de la fase actual (contraccion o espera), para "GAS CLOSING". */
  ticksParaProximoCambio: number;
}

export interface BotinSnapshot {
  id: number;
  /** BOTIQUIN | PISTOLA | ESCOPETA | RIFLE */
  tipo: string;
  x: number;
  y: number;
}

export interface Snapshot {
  v: Version;
  tipo: 'SNAPSHOT';
  tick: number;
  estado: EstadoPartida;
  /** Tick en que la partida entro en EN_CURSO; base para calcular el TIME del HUD (R27). */
  tickInicio: number;
  /** Ticks que faltan para EN_CURSO; solo presente durante CUENTA_REGRESIVA (R27). */
  ticksParaInicio: number | null;
  /** Ultima `sec` procesada por jugador (habilita la prediccion de la Fase 7). */
  acks: Record<string, number>;
  jugadores: JugadorSnapshot[];
  proyectiles: ProyectilSnapshot[];
  /** Null hasta que la partida entra EN_CURSO. */
  zona: ZonaSnapshot | null;
  botines: BotinSnapshot[];
}

export interface Evento {
  v: Version;
  tipo: 'EVENTO';
  /** Clase de evento. Fase 2: 'KILL'. Crecera (MUERTE_ZONA, RECOGIDO, FIN_PARTIDA...). */
  evento: string;
  datos: Record<string, string>;
}

export type MensajeServidor = Bienvenida | Snapshot | Evento;
