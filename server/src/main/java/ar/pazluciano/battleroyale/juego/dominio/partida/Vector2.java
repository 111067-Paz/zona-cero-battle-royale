package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Vector 2D inmutable en coordenadas de mundo (PLAN §8.6). Value object del dominio: toda la
 * matematica de movimiento vive aca, no dispersa por la simulacion.
 *
 * <p>Usa {@code double} (fisica = matematica continua) y compara SIEMPRE con epsilon, jamas con
 * {@code ==}. Cada operacion devuelve una instancia nueva: nunca se muta en el lugar, lo que elimina
 * aliasing accidental cuando el snapshot copia posiciones.
 */
public final class Vector2 {

    private static final double EPSILON = 1e-9;

    /** Vector nulo reutilizable (inmutable, se puede compartir sin riesgo). */
    public static final Vector2 CERO = new Vector2(0.0, 0.0);

    private final double x;
    private final double y;

    public Vector2(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public double getX() {
        return x;
    }

    public double getY() {
        return y;
    }

    public Vector2 sumar(Vector2 otro) {
        return new Vector2(x + otro.x, y + otro.y);
    }

    public Vector2 escalar(double factor) {
        return new Vector2(x * factor, y * factor);
    }

    public double longitud() {
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Direccion unitaria. Si el vector es (casi) nulo devuelve {@link #CERO}, evitando dividir por
     * cero cuando el jugador no se mueve.
     */
    public Vector2 normalizado() {
        double longitud = longitud();
        if (longitud < EPSILON) {
            return CERO;
        }
        return new Vector2(x / longitud, y / longitud);
    }

    /**
     * Recorta la magnitud a {@code longitudMaxima} conservando la direccion. Es la herramienta
     * anti speed-hack: el server la usa sobre el {@code mover} del cliente para que ni un vector
     * gigante ni una diagonal den mas velocidad que la permitida.
     */
    public Vector2 conLongitudMaxima(double longitudMaxima) {
        if (longitud() <= longitudMaxima) {
            return this;
        }
        return normalizado().escalar(longitudMaxima);
    }

    /** Igualdad por componentes con tolerancia epsilon. Para asserts y logica, nunca para hashing. */
    public boolean casiIgual(Vector2 otro) {
        return Math.abs(x - otro.x) < EPSILON && Math.abs(y - otro.y) < EPSILON;
    }

    @Override
    public String toString() {
        return "Vector2(" + x + ", " + y + ")";
    }
}
