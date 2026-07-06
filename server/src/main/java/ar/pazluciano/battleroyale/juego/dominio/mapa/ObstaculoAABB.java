package ar.pazluciano.battleroyale.juego.dominio.mapa;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import lombok.Getter;

/**
 * Obstaculo rectangular alineado a los ejes (Axis-Aligned Bounding Box), en coordenadas de mundo
 * (PLAN §4.1). Es un colisionador rigido: cajas, rocas, arboles y carpas del mapa. Inmutable.
 *
 * <p>Se define por su esquina superior-izquierda {@code (x, y)} y su tamano {@code (ancho, alto)},
 * cubriendo el area {@code [x, x+ancho] x [y, y+alto]}. El rio y otras decoraciones NO son
 * obstaculos: no colisionan y por eso no se modelan aca (R36).
 */
@Getter
public final class ObstaculoAABB {

    private final double x;
    private final double y;
    private final double ancho;
    private final double alto;

    public ObstaculoAABB(double x, double y, double ancho, double alto) {
        this.x = x;
        this.y = y;
        this.ancho = ancho;
        this.alto = alto;
    }

    public double bordeDerecho() {
        return x + ancho;
    }

    public double bordeInferior() {
        return y + alto;
    }

    /** Punto del rectangulo mas cercano a {@code punto} (clamp por eje). Si el punto esta dentro,
     *  devuelve el mismo punto. Es la base de la colision circulo-vs-AABB. */
    public Vector2 puntoMasCercanoA(Vector2 punto) {
        double cx = Math.max(x, Math.min(punto.getX(), bordeDerecho()));
        double cy = Math.max(y, Math.min(punto.getY(), bordeInferior()));
        return new Vector2(cx, cy);
    }

    /** Indica si el punto cae dentro del rectangulo (bordes incluidos). */
    public boolean contiene(Vector2 punto) {
        return punto.getX() >= x && punto.getX() <= bordeDerecho()
                && punto.getY() >= y && punto.getY() <= bordeInferior();
    }
}
