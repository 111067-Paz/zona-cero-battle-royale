package ar.pazluciano.battleroyale.juego.red;

import ar.pazluciano.battleroyale.juego.motor.ConexionJugador;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

/**
 * Adaptador de {@link ConexionJugador} sobre una sesion WebSocket de Spring (capa red).
 *
 * <p>Envuelve una sesion ya decorada con {@code ConcurrentWebSocketSessionDecorator}: los envios son
 * thread-safe y no bloqueantes, con limites de tiempo/buffer, para que un cliente lento nunca frene
 * el tick (R5). El loop escribe a traves de esta abstraccion sin saber que hay un WebSocket detras.
 */
@Slf4j
public class SesionWebSocket implements ConexionJugador {

    private final String idJugador;
    private final String idPartida;
    private final WebSocketSession sesionDecorada;

    public SesionWebSocket(String idJugador, String idPartida, WebSocketSession sesionDecorada) {
        this.idJugador = idJugador;
        this.idPartida = idPartida;
        this.sesionDecorada = sesionDecorada;
    }

    @Override
    public String idJugador() {
        return idJugador;
    }

    /** A que partida pertenece esta sesion (F6, multi-partida): resuelve el loop en el handler. */
    public String idPartida() {
        return idPartida;
    }

    @Override
    public void enviar(String mensajeJson) {
        try {
            if (sesionDecorada.isOpen()) {
                sesionDecorada.sendMessage(new TextMessage(mensajeJson));
            }
        } catch (IOException e) {
            log.warn("Fallo al enviar a {}: {}", idJugador, e.getMessage());
            cerrar();
        }
    }

    @Override
    public void cerrar() {
        try {
            if (sesionDecorada.isOpen()) {
                sesionDecorada.close(CloseStatus.NORMAL);
            }
        } catch (IOException e) {
            log.warn("Fallo al cerrar {}: {}", idJugador, e.getMessage());
        }
    }

    @Override
    public boolean estaAbierta() {
        return sesionDecorada.isOpen();
    }
}
