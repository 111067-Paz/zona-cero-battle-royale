package ar.pazluciano.battleroyale.juego.motor;

/**
 * Puerto de salida del motor hacia una conexion cliente (patron Ports & Adapters).
 *
 * <p>Lo DEFINE el motor y lo IMPLEMENTA la capa {@code red} (inversion de dependencias): asi el loop
 * envia BIENVENIDA y SNAPSHOT sin conocer WebSocket ni Spring. La implementacion concreta envuelve
 * un {@code ConcurrentWebSocketSessionDecorator} para escribir de forma thread-safe y no bloqueante
 * (PLAN §2.4, R5): un cliente lento nunca frena el tick.
 */
public interface ConexionJugador {

    /** Identidad del jugador asociada a esta conexion, asignada al crear la sesion. */
    String idJugador();

    /** Envia un mensaje ya serializado. No debe bloquear el hilo del loop. */
    void enviar(String mensajeJson);

    /** Cierra la conexion con codigo normal. */
    void cerrar();

    /** Indica si la conexion sigue abierta. */
    boolean estaAbierta();
}
