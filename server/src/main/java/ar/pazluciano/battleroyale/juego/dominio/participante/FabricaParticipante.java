package ar.pazluciano.battleroyale.juego.dominio.participante;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;

import java.util.Random;

/**
 * Abstract Factory de participantes: produce la FAMILIA coherente {arma + comportamiento} que define
 * a un participante (PLAN §6). Cada implementacion es un arquetipo consistente: humano, asaltante,
 * francotirador, explorador... Intercambiar la fabrica intercambia el participante entero, con la
 * garantia de que el arma y la IA van acordes (un francotirador con escopeta no puede ocurrir).
 *
 * <p>Sumar un arquetipo nuevo es una clase nueva que implementa esta interfaz: la Partida no cambia.
 */
public interface FabricaParticipante {

    /** Arma inicial. Recibe el RNG sembrado de la partida por si el arquetipo la elige al azar. */
    Arma crearArma(Random rng);

    /** Fuente de intencion: Null Object para el humano, FSM para un bot. */
    Comportamiento crearComportamiento();
}
