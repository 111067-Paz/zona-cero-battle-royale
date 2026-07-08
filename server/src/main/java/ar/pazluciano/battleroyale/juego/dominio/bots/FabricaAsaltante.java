package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import ar.pazluciano.battleroyale.juego.dominio.combate.Escopeta;
import ar.pazluciano.battleroyale.juego.dominio.participante.Comportamiento;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaParticipante;

import java.util.Random;

/**
 * Arquetipo AGRESIVO (familia del Abstract Factory): Escopeta + IA que persigue de cerca, con radios
 * chicos y reaccion rapida. La familia es coherente: escopeta (letal de cerca) va con un bot que
 * busca el cuerpo a cuerpo.
 */
public class FabricaAsaltante implements FabricaParticipante {

    private static final DificultadBot DIFICULTAD = DificultadBot.builder()
            .radioDeteccion(22.0)
            .radioPerdida(28.0)
            .radioAtaque(14.0)
            .radioAtaquePerdida(18.0)
            .precisionAngular(0.12)
            .reaccionTicks(6)
            .ticksRumboMin(20)
            .ticksRumboMax(50)
            .build();

    @Override
    public Arma crearArma(Random rng) {
        return new Escopeta();
    }

    @Override
    public Comportamiento crearComportamiento() {
        return new ComportamientoFsm(DIFICULTAD);
    }
}
