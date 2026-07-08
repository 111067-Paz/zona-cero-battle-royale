package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.dominio.participante.VistaMundo;

import java.util.Optional;

/**
 * Percepcion de un bot (puro): el rival VIVO mas cercano dentro de un radio Y con linea de vista. Un
 * bot no "sabe" de un rival si hay una pared en el medio (reutiliza el raycast del {@link VistaMundo},
 * que a su vez usa la colision por segmento de la Fase 2).
 */
public class PercepcionBot {

    public Optional<Jugador> rivalMasCercanoVisible(Jugador bot, VistaMundo mundo, double radio) {
        Jugador elegido = null;
        double mejorDistancia = Double.POSITIVE_INFINITY;
        for (Jugador rival : mundo.rivalesVivos(bot.getId())) {
            double distancia = distancia(bot.getPosicion(), rival.getPosicion());
            if (distancia <= radio && distancia < mejorDistancia
                    && mundo.hayLineaDeVista(bot.getPosicion(), rival.getPosicion())) {
                mejorDistancia = distancia;
                elegido = rival;
            }
        }
        return Optional.ofNullable(elegido);
    }

    private double distancia(Vector2 a, Vector2 b) {
        return Math.hypot(a.getX() - b.getX(), a.getY() - b.getY());
    }
}
