package ar.pazluciano.battleroyale.juego.dominio.participante;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

import java.util.List;

/**
 * Puerto (DIP) que describe lo que un {@link Comportamiento} puede percibir del mundo. La
 * {@code Partida} lo implementa; el comportamiento depende de esta abstraccion, no de la Partida
 * concreta, de modo que se puede testear con un mundo de mentira.
 */
public interface VistaMundo {

    /** Jugadores VIVOS distintos del propio (conectados o no, R26): posibles objetivos. */
    List<Jugador> rivalesVivos(String idPropio);

    /** Indica si el segmento entre dos puntos NO esta bloqueado por un obstaculo (raycast). */
    boolean hayLineaDeVista(Vector2 desde, Vector2 hasta);
}
