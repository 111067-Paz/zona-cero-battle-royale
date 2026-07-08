package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

import java.util.Optional;

/**
 * Rival en rango de tiro y a la vista: el bot apunta (con el ruido de {@code precisionAngular}) y
 * DISPARA, manteniendo una distancia comoda (se acerca si esta lejos, se planta si ya esta cerca).
 * Usa el radio de PERDIDA de ataque (mayor) para seguir atacando — histeresis. Si el rival se aleja o
 * se cubre, vuelve a PERSEGUIR (que a su vez decidira si merodear).
 */
public class Atacando implements EstadoComportamiento {

    private static final double FRACCION_DISTANCIA_COMODA = 0.5;

    @Override
    public EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados) {
        DificultadBot dificultad = contexto.getDificultad();
        Optional<Jugador> rival = contexto.rivalVisible(dificultad.getRadioAtaquePerdida());
        if (rival.isEmpty()) {
            return estados.persiguiendo();
        }
        Jugador objetivo = rival.get();
        double angulo = contexto.anguloHacia(objetivo) + ruido(contexto, dificultad);
        Vector2 mover = contexto.distanciaA(objetivo) > dificultad.getRadioAtaque() * FRACCION_DISTANCIA_COMODA
                ? contexto.direccionHacia(objetivo)
                : Vector2.CERO;
        contexto.aplicarIntencion(mover, angulo, true);
        return this;
    }

    private double ruido(ContextoBot contexto, DificultadBot dificultad) {
        return (contexto.getRng().nextDouble() * 2.0 - 1.0) * dificultad.getPrecisionAngular();
    }
}
