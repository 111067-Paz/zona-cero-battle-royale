package ar.pazluciano.battleroyale.juego.dominio.combate;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import lombok.Getter;

/**
 * Resultado de evaluar el segmento de un proyectil contra el mundo: nada, una pared, o un jugador.
 * Lleva el parametro {@code t} del impacto a lo largo del segmento (para elegir el mas cercano) y el
 * punto de impacto. La {@code victima} solo esta presente cuando el tipo es {@link Tipo#JUGADOR}.
 */
@Getter
public final class ImpactoSegmento {

    public enum Tipo { NINGUNO, PARED, JUGADOR }

    private final Tipo tipo;
    private final double t;
    private final Vector2 punto;
    private final Jugador victima;

    private ImpactoSegmento(Tipo tipo, double t, Vector2 punto, Jugador victima) {
        this.tipo = tipo;
        this.t = t;
        this.punto = punto;
        this.victima = victima;
    }

    public static ImpactoSegmento ninguno() {
        return new ImpactoSegmento(Tipo.NINGUNO, Double.POSITIVE_INFINITY, null, null);
    }

    public static ImpactoSegmento pared(double t, Vector2 punto) {
        return new ImpactoSegmento(Tipo.PARED, t, punto, null);
    }

    public static ImpactoSegmento jugador(double t, Vector2 punto, Jugador victima) {
        return new ImpactoSegmento(Tipo.JUGADOR, t, punto, victima);
    }

    public boolean impactoJugador() {
        return tipo == Tipo.JUGADOR;
    }

    public boolean huboImpacto() {
        return tipo != Tipo.NINGUNO;
    }
}
