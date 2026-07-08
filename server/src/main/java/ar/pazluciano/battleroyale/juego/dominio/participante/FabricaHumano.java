package ar.pazluciano.battleroyale.juego.dominio.participante;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import ar.pazluciano.battleroyale.juego.dominio.combate.Pistola;

import java.util.Random;

/**
 * Arquetipo HUMANO (una familia mas del Abstract Factory): nace con Pistola (R17) y su intencion la
 * escribe la red, por eso su comportamiento es el Null Object {@link ComportamientoRemoto}. Que el
 * humano sea "otra fabrica" es lo que unifica la creacion de humanos y bots (§4.1).
 */
public class FabricaHumano implements FabricaParticipante {

    @Override
    public Arma crearArma(Random rng) {
        return new Pistola();
    }

    @Override
    public Comportamiento crearComportamiento() {
        return new ComportamientoRemoto();
    }
}
