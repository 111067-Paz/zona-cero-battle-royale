package ar.pazluciano.battleroyale.juego.dominio.participante;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;

import java.util.Random;

/**
 * Comportamiento de un participante HUMANO (patron Null Object). No hace nada: la intencion del
 * humano la escribe la red (via {@code Partida.aplicarInput}), asi que "pensar" es un no-op.
 *
 * <p>Existe para que el loop trate a todos los participantes IGUAL: cada uno tiene un comportamiento
 * y se le llama {@code pensar} sin ramas ni chequeos de nulo. La uniformidad total del §4.1.
 */
public class ComportamientoRemoto implements Comportamiento {

    @Override
    public void pensar(Jugador jugador, VistaMundo mundo, Random rng) {
        // Intencionalmente vacio: la intencion del humano ya llego por la red.
    }
}
