package ar.pazluciano.battleroyale.comun.personajes;

import java.util.Arrays;
import java.util.Optional;

/**
 * Personaje chibi elegido por un usuario (PLAN §15, estetica "Battle Bash"). Vive en {@code comun}
 * a proposito: lo persiste {@code plataforma} (cuenta del usuario) y lo consume {@code juego}
 * (viaja en el snapshot para que TODOS vean el aspecto elegido) — igual criterio que
 * {@link ar.pazluciano.battleroyale.comun.tickets.TicketService}, el punto de encuentro neutral
 * entre los dos modulos.
 */
public enum Personaje {
    BARBARROJA,
    PIRATA_ANNE,
    PIRATA_HENRY,
    ESQUELETO,
    TIBURON,
    GATO,
    DINO,
    ROBO_PERRO,
    CONEJO,
    ARDILLA;

    /** Validacion de borde REST: texto invalido -> vacio, nunca una excepcion de Jackson. */
    public static Optional<Personaje> desdeTexto(String texto) {
        if (texto == null) {
            return Optional.empty();
        }
        return Arrays.stream(values())
                .filter(personaje -> personaje.name().equalsIgnoreCase(texto))
                .findFirst();
    }
}
