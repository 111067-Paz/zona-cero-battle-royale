package ar.pazluciano.battleroyale.juego.dominio.mapa;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

/**
 * Resuelve la colision de un jugador circular contra los obstaculos AABB y los bordes del mapa
 * (PLAN §4.1, §8.3). Stateless y puro: misma entrada, misma salida, sin efectos.
 *
 * <p>Metodo: mover primero, corregir despues (valido en Fase 1 porque el jugador avanza ~0.167 u por
 * tick y ningun obstaculo es mas fino que 1 u; el barrido por segmento se reserva para los
 * proyectiles rapidos de la Fase 2). Por cada obstaculo penetrado, empuja el centro hacia afuera SOLO
 * por la normal: la componente tangencial (a lo largo de la pared) se conserva, de modo que el
 * DESLIZAMIENTO y el rodeo de esquinas salen naturalmente. Repite unas pocas pasadas para resolver
 * solapamientos multiples y termina con un clamp a los bordes.
 */
public class ResolutorColisiones {

    private static final int MAX_PASADAS = 3;
    private static final double EPSILON = 1e-9;

    public Vector2 resolver(Vector2 posicionDeseada, double radio, MapaJuego mapa) {
        Vector2 posicion = posicionDeseada;
        for (int pasada = 0; pasada < MAX_PASADAS; pasada++) {
            boolean hubieroCorrecciones = false;
            for (ObstaculoAABB obstaculo : mapa.getObstaculos()) {
                Vector2 corregida = resolverContra(posicion, radio, obstaculo);
                if (!posicion.casiIgual(corregida)) {
                    posicion = corregida;
                    hubieroCorrecciones = true;
                }
            }
            if (!hubieroCorrecciones) {
                break;
            }
        }
        return dentroDeLosBordes(posicion, radio, mapa);
    }

    private Vector2 resolverContra(Vector2 centro, double radio, ObstaculoAABB obstaculo) {
        if (obstaculo.contiene(centro)) {
            return empujarDesdeAdentro(centro, radio, obstaculo);
        }
        Vector2 masCercano = obstaculo.puntoMasCercanoA(centro);
        Vector2 delta = centro.sumar(masCercano.escalar(-1.0));
        double distancia = delta.longitud();
        if (distancia >= radio) {
            return centro; // sin contacto
        }
        if (distancia < EPSILON) {
            return empujarDesdeAdentro(centro, radio, obstaculo); // justo sobre el borde
        }
        double penetracion = radio - distancia;
        Vector2 normal = delta.escalar(1.0 / distancia);
        return centro.sumar(normal.escalar(penetracion));
    }

    /**
     * El centro quedo DENTRO del obstaculo (o exactamente sobre su borde). Lo expulsa por el eje de
     * MENOR penetracion, dejando el circulo apenas afuera (a distancia radio del borde cruzado).
     */
    private Vector2 empujarDesdeAdentro(Vector2 centro, double radio, ObstaculoAABB obstaculo) {
        double haciaIzquierda = centro.getX() - obstaculo.getX();
        double haciaDerecha = obstaculo.bordeDerecho() - centro.getX();
        double haciaArriba = centro.getY() - obstaculo.getY();
        double haciaAbajo = obstaculo.bordeInferior() - centro.getY();

        double minimo = Math.min(Math.min(haciaIzquierda, haciaDerecha), Math.min(haciaArriba, haciaAbajo));
        if (minimo == haciaIzquierda) {
            return new Vector2(obstaculo.getX() - radio, centro.getY());
        }
        if (minimo == haciaDerecha) {
            return new Vector2(obstaculo.bordeDerecho() + radio, centro.getY());
        }
        if (minimo == haciaArriba) {
            return new Vector2(centro.getX(), obstaculo.getY() - radio);
        }
        return new Vector2(centro.getX(), obstaculo.bordeInferior() + radio);
    }

    private Vector2 dentroDeLosBordes(Vector2 posicion, double radio, MapaJuego mapa) {
        double x = Math.min(mapa.getAncho() - radio, Math.max(radio, posicion.getX()));
        double y = Math.min(mapa.getAlto() - radio, Math.max(radio, posicion.getY()));
        return new Vector2(x, y);
    }
}
