package ar.pazluciano.battleroyale.juego.dominio.mapa;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import lombok.Getter;

import java.util.List;

/**
 * Vista de un mapa que necesita la SIMULACION (PLAN §4.1): dimensiones, obstaculos con colision y
 * puntos de spawn. Inmutable y compartible entre partidas.
 *
 * <p>Es la proyeccion PURA de la definicion del mapa: la decoracion (rio, flores) no aparece aca
 * porque no afecta la simulacion; vive solo en la definicion que se sirve al cliente por REST (R36).
 * Los spawns se validan al cargar el mapa (fuera de obstaculos, dentro de bordes): fail-fast.
 */
@Getter
public final class MapaJuego {

    private final String id;
    private final double ancho;
    private final double alto;
    private final List<ObstaculoAABB> obstaculos;
    private final List<Vector2> spawns;

    public MapaJuego(String id, double ancho, double alto, List<ObstaculoAABB> obstaculos,
                     List<Vector2> spawns) {
        this.id = id;
        this.ancho = ancho;
        this.alto = alto;
        this.obstaculos = List.copyOf(obstaculos);
        this.spawns = List.copyOf(spawns);
    }

    /**
     * Punto de spawn para el {@code n}-esimo jugador que se une (determinista). Rota sobre la lista
     * si hay mas jugadores que spawns definidos.
     */
    public Vector2 spawnPara(int ordenUnion) {
        return spawns.get(ordenUnion % spawns.size());
    }
}
