package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Un estado del ciclo de vida de la {@link Partida} (patron State, PLAN §4.3/§6). Cada estado sabe que
 * hacer en SU tick y decide la transicion; los efectos de entrar a un estado nuevo los dispara el
 * propio estado que transiciona, justo antes de devolver el siguiente (mismo estilo que la FSM de
 * bots, sin hooks separados).
 */
public interface EstadoDePartida {

    /** Ejecuta este tick del estado y devuelve el proximo estado (o {@code this} si no hay transicion). */
    EstadoDePartida procesarTick(Partida partida);

    /** Valor que viaja en el snapshot para que el cliente sepa que pantalla mostrar (R27). */
    EstadoPartida tipo();
}
