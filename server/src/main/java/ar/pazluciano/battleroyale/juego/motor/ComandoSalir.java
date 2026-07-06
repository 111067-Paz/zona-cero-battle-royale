package ar.pazluciano.battleroyale.juego.motor;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Abandono voluntario del jugador. En la Fase 0 el loop lo resuelve quitando al jugador de la
 * partida; la semantica por estado (abandono = muerte en curso) llega con el State completo (F4).
 */
@Getter
@RequiredArgsConstructor
public final class ComandoSalir implements Comando {

    private final String idJugador;
}
