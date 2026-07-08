/**
 * Tipos del modulo plataforma (PLAN §4.2/§15.2). Espejo de los DTOs Java de
 * {@code plataforma/dtos}. El registro y el login viajan por HTTPS/localStorage — jamas por el
 * WebSocket de juego (esa frontera la marca R1: el juego solo conoce el ticket de un solo uso).
 */

export interface RegisterRequest {
  nombreUsuario: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  nombreUsuario: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UsuarioDTO {
  id: number;
  nombreUsuario: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Segundos hasta que expira el access token. */
  expiraEnSegundos: number;
  usuario: UsuarioDTO;
}

export interface TicketResponse {
  ticket: string;
}

export interface EstadisticaDTO {
  nombreUsuario: string;
  partidasJugadas: number;
  victorias: number;
  kills: number;
  muertes: number;
  top3: number;
  kd: number;
}

export interface PaginaEstadisticas {
  content: EstadisticaDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
}

/** Respuesta del polling de matchmaking (PLAN §5.5, R21). `idPartida` solo llega ya asignado. */
export interface EstadoMatchmakingDTO {
  enCola: boolean;
  jugadoresEncontrados: number | null;
  idPartida: string | null;
}
