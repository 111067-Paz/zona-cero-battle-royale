package ar.pazluciano.battleroyale.plataforma.exceptions;

/** Rate limit de /api/auth/login superado (lockout temporal). */
public class DemasiadosIntentosException extends RuntimeException {

    public DemasiadosIntentosException(String message) {
        super(message);
    }
}
