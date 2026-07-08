package ar.pazluciano.battleroyale.juego.motor;

/** El usuario ya esta en la cola de matchmaking o ya tiene una partida asignada (R6). */
public class UsuarioYaEnColaException extends RuntimeException {

    public UsuarioYaEnColaException(String message) {
        super(message);
    }
}
