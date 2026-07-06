package ar.pazluciano.battleroyale.juego.dominio.combate;

import ar.pazluciano.battleroyale.juego.dominio.mapa.ObstaculoAABB;
import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

import java.util.List;
import java.util.OptionalDouble;

/**
 * Resuelve el impacto del SEGMENTO recorrido por un proyectil en un tick (PLAN §8.3). Stateless y
 * puro. Es el anti-tunneling: evalua toda la trayectoria {@code p0 -> p1}, no solo el punto final, asi
 * una bala rapida no "salta" una pared fina entre dos ticks.
 *
 * <p>Primero mira las paredes (recortan el rayo) y los jugadores, y devuelve el impacto de menor
 * {@code t} (el mas cercano al origen). Los objetivos que recibe ya vienen filtrados por la Partida
 * (VIVOS, sin el dueno del proyectil).
 */
public class ColisionSegmento {

    private static final double EPSILON = 1e-9;

    public ImpactoSegmento primerImpacto(Vector2 p0, Vector2 p1, List<ObstaculoAABB> obstaculos,
                                         List<Jugador> objetivos, double radioJugador) {
        ImpactoSegmento mejor = ImpactoSegmento.ninguno();

        for (ObstaculoAABB obstaculo : obstaculos) {
            OptionalDouble t = interseccionAABB(p0, p1, obstaculo);
            if (t.isPresent() && t.getAsDouble() < mejor.getT()) {
                mejor = ImpactoSegmento.pared(t.getAsDouble(), puntoEn(p0, p1, t.getAsDouble()));
            }
        }
        for (Jugador objetivo : objetivos) {
            OptionalDouble t = interseccionCirculo(p0, p1, objetivo.getPosicion(), radioJugador);
            if (t.isPresent() && t.getAsDouble() < mejor.getT()) {
                mejor = ImpactoSegmento.jugador(t.getAsDouble(), puntoEn(p0, p1, t.getAsDouble()), objetivo);
            }
        }
        return mejor;
    }

    private Vector2 puntoEn(Vector2 p0, Vector2 p1, double t) {
        return p0.sumar(p1.sumar(p0.escalar(-1.0)).escalar(t));
    }

    /** Interseccion segmento-circulo: devuelve el menor t en [0,1] donde el segmento toca el circulo. */
    private OptionalDouble interseccionCirculo(Vector2 p0, Vector2 p1, Vector2 centro, double radio) {
        double dx = p1.getX() - p0.getX();
        double dy = p1.getY() - p0.getY();
        double fx = p0.getX() - centro.getX();
        double fy = p0.getY() - centro.getY();

        double a = dx * dx + dy * dy;
        if (a < EPSILON) {
            return OptionalDouble.empty(); // segmento de longitud cero
        }
        double b = 2.0 * (fx * dx + fy * dy);
        double c = fx * fx + fy * fy - radio * radio;
        double discriminante = b * b - 4.0 * a * c;
        if (discriminante < 0.0) {
            return OptionalDouble.empty();
        }
        double raiz = Math.sqrt(discriminante);
        double tEntrada = (-b - raiz) / (2.0 * a);
        double tSalida = (-b + raiz) / (2.0 * a);
        if (tEntrada >= 0.0 && tEntrada <= 1.0) {
            return OptionalDouble.of(tEntrada);
        }
        if (tEntrada < 0.0 && tSalida >= 0.0) {
            return OptionalDouble.of(0.0); // p0 arranca dentro del circulo
        }
        return OptionalDouble.empty();
    }

    /** Interseccion segmento-AABB por metodo de slabs: t de ENTRADA en [0,1] si el rayo cruza la caja. */
    private OptionalDouble interseccionAABB(Vector2 p0, Vector2 p1, ObstaculoAABB obstaculo) {
        double dx = p1.getX() - p0.getX();
        double dy = p1.getY() - p0.getY();

        double[] rangoX = slab(p0.getX(), dx, obstaculo.getX(), obstaculo.bordeDerecho());
        if (rangoX == null) {
            return OptionalDouble.empty();
        }
        double[] rangoY = slab(p0.getY(), dy, obstaculo.getY(), obstaculo.bordeInferior());
        if (rangoY == null) {
            return OptionalDouble.empty();
        }
        double tEntrada = Math.max(0.0, Math.max(rangoX[0], rangoY[0]));
        double tSalida = Math.min(1.0, Math.min(rangoX[1], rangoY[1]));
        if (tEntrada > tSalida) {
            return OptionalDouble.empty();
        }
        return OptionalDouble.of(tEntrada);
    }

    /** Rango [tMin, tMax] en el que el segmento esta dentro de un slab [min, max] de un eje. */
    private double[] slab(double origen, double direccion, double min, double max) {
        if (Math.abs(direccion) < EPSILON) {
            if (origen < min || origen > max) {
                return null; // paralelo y fuera del slab: nunca entra
            }
            return new double[]{Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY};
        }
        double t1 = (min - origen) / direccion;
        double t2 = (max - origen) / direccion;
        if (t1 > t2) {
            double intercambio = t1;
            t1 = t2;
            t2 = intercambio;
        }
        return new double[]{t1, t2};
    }
}
