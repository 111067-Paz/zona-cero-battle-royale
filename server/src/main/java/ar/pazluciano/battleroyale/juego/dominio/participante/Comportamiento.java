package ar.pazluciano.battleroyale.juego.dominio.participante;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;

import java.util.Random;

/**
 * Fuente de la intencion de un participante (patron Strategy). Es la unica diferencia entre un humano
 * y un bot (PLAN §4.1): el humano la recibe de la red, el bot de una FSM. Despues de este paso la
 * simulacion es ciega a quien escribio la intencion — cero {@code if(esBot)}.
 *
 * <p>Escribe la intencion en el {@link Jugador} (via {@code aplicarInput}), exactamente como lo hace
 * la red para un humano. Recibe el {@link Random} sembrado de la partida para ser deterministico.
 */
public interface Comportamiento {

    void pensar(Jugador jugador, VistaMundo mundo, Random rng);
}
