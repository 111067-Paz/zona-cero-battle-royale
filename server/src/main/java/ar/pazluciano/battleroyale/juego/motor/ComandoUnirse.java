package ar.pazluciano.battleroyale.juego.motor;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Pedido de alta de una conexion en la partida. Carga el puerto {@link ConexionJugador}: el loop lo
 * usa para crear el jugador, enviarle BIENVENIDA y recien entonces sumarlo a la lista de emision
 * (R25), garantizando que jamas reciba un SNAPSHOT antes de su BIENVENIDA.
 */
@Getter
@RequiredArgsConstructor
public final class ComandoUnirse implements Comando {

    private final ConexionJugador conexion;
}
