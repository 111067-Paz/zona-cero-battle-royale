package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Fase del ciclo de vida de una {@link Partida} (patron State, PLAN §4.3).
 *
 * <p>El SNAPSHOT lo lleva SIEMPRE (R27) para que el cliente sepa que pantalla renderizar. En la
 * Fase 0 la partida arranca directamente en {@link #EN_CURSO}; el resto de las transiciones llega
 * en la Fase 4.
 */
public enum EstadoPartida {
    EN_LOBBY,
    CUENTA_REGRESIVA,
    EN_CURSO,
    FINALIZADA
}
