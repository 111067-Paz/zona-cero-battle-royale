package ar.pazluciano.battleroyale.plataforma.exceptions;

/** Usuario inexistente o password incorrecta. Mensaje deliberadamente generico (no revela cual). */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String message) {
        super(message);
    }
}
