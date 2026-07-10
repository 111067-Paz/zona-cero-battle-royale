package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Pedido de alta de una conexion en la partida. Carga el puerto {@link ConexionJugador}: el loop lo
 * usa para crear el jugador, enviarle BIENVENIDA y recien entonces sumarlo a la lista de emision
 * (R25), garantizando que jamas reciba un SNAPSHOT antes de su BIENVENIDA. Tambien carga el
 * {@link Personaje} elegido (viene del ticket, PLAN §15) para que el loop lo registre en el
 * {@link EnsambladorSnapshot}.
 */
@Getter
@RequiredArgsConstructor
public final class ComandoUnirse implements Comando {

    private final ConexionJugador conexion;
    private final Personaje personaje;
}
