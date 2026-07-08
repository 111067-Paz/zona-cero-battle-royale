package ar.pazluciano.battleroyale.plataforma.exceptions;

/** El nombre de usuario o el email ya estan registrados. */
public class UsuarioYaExisteException extends RuntimeException {

    public UsuarioYaExisteException(String message) {
        super(message);
    }
}
