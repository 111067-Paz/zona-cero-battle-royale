package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Acciones one-shot que un jugador puede pedir en un INPUT (PLAN §5.1).
 *
 * <p>Se encolan y se consumen UNA vez (tope 2 por tick por jugador). En la Fase 0 el campo existe
 * en el protocolo para fijar el contrato, pero el dominio todavia no las procesa: el looteo llega
 * en la Fase 4.
 */
public enum AccionJugador {
    RECOGER,
    USAR_BOTIQUIN
}
