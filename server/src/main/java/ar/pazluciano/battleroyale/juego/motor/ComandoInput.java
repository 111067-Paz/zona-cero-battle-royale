package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.juego.protocolo.Input;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * INPUT ya parseado y validado en forma, listo para que el loop lo aplique al jugador dueno de la
 * conexion. El loop ordena el lote de inputs por (orden de union, sec) antes de aplicarlos, para
 * un determinismo total (PLAN §7-C).
 */
@Getter
@RequiredArgsConstructor
public final class ComandoInput implements Comando {

    private final String idJugador;
    private final Input input;
}
