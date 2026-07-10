package ar.pazluciano.battleroyale.plataforma.exceptions;

/** El texto recibido no corresponde a ningun {@link ar.pazluciano.battleroyale.comun.personajes.Personaje}. */
public class PersonajeInvalidoException extends RuntimeException {

    public PersonajeInvalidoException(String message) {
        super(message);
    }
}
