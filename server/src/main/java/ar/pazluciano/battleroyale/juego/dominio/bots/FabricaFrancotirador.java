package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import ar.pazluciano.battleroyale.juego.dominio.combate.Rifle;
import ar.pazluciano.battleroyale.juego.dominio.participante.Comportamiento;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaParticipante;

import java.util.Random;

/**
 * Arquetipo FRANCOTIRADOR (familia del Abstract Factory): Rifle + IA cautelosa que ataca de lejos con
 * alta precision y mantiene distancia. La familia es coherente: rifle (rapido, largo alcance) va con
 * un bot que dispara desde lejos, no que se lanza al cuerpo a cuerpo.
 */
public class FabricaFrancotirador implements FabricaParticipante {

    private static final DificultadBot DIFICULTAD = DificultadBot.builder()
            .radioDeteccion(45.0)
            .radioPerdida(55.0)
            .radioAtaque(40.0)
            .radioAtaquePerdida(48.0)
            .precisionAngular(0.04)
            .reaccionTicks(10)
            .ticksRumboMin(40)
            .ticksRumboMax(80)
            .build();

    @Override
    public Arma crearArma(Random rng) {
        return new Rifle();
    }

    @Override
    public Comportamiento crearComportamiento() {
        return new ComportamientoFsm(DIFICULTAD);
    }
}
