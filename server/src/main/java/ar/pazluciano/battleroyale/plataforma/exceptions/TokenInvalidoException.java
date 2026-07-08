package ar.pazluciano.battleroyale.plataforma.exceptions;

/** Refresh token inexistente, expirado o ya revocado (incluye la respuesta a un intento de robo, R18). */
public class TokenInvalidoException extends RuntimeException {

    public TokenInvalidoException(String message) {
        super(message);
    }
}
