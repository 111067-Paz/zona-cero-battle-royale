package ar.pazluciano.battleroyale.juego.motor;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Cierre de socket detectado por la capa de red. Se encola para que la mutacion ocurra, como
 * siempre, en el hilo del loop. En la Fase 0 el loop quita al jugador; la gracia de reconexion de
 * 300 ticks (R26) se implementa en la Fase 5 junto con la identidad persistente.
 */
@Getter
@RequiredArgsConstructor
public final class ComandoDesconexion implements Comando {

    private final String idJugador;
}
