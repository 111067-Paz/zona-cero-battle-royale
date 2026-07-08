package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import ar.pazluciano.battleroyale.juego.dominio.combate.Pistola;
import ar.pazluciano.battleroyale.juego.dominio.participante.Comportamiento;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaParticipante;

import java.util.Random;

/**
 * Arquetipo EXPLORADOR (familia del Abstract Factory): Pistola + IA equilibrada — el perfil "medio"
 * del DoD. Distancias y precision intermedias: ni se lanza como el asaltante ni se esconde como el
 * francotirador.
 */
public class FabricaExplorador implements FabricaParticipante {

    private static final DificultadBot DIFICULTAD = DificultadBot.builder()
            .radioDeteccion(30.0)
            .radioPerdida(36.0)
            .radioAtaque(20.0)
            .radioAtaquePerdida(26.0)
            .precisionAngular(0.08)
            .reaccionTicks(8)
            .ticksRumboMin(30)
            .ticksRumboMax(60)
            .build();

    @Override
    public Arma crearArma(Random rng) {
        return new Pistola();
    }

    @Override
    public Comportamiento crearComportamiento() {
        return new ComportamientoFsm(DIFICULTAD);
    }
}
