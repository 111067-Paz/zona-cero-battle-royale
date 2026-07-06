package ar.pazluciano.battleroyale.juego.red;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Registro del endpoint de juego en {@code /ws/partida} (PLAN §7-A). Handler crudo, sin STOMP: el
 * broker de topicos agrega capas que un juego no necesita y esconde el control fino del envio.
 *
 * <p>En dev se aceptan todos los origenes porque el proxy de Angular reenvia {@code /ws} al mismo
 * host. En produccion (Fase 9) el origen se restringe.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final HandlerPartida handlerPartida;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handlerPartida, "/ws/partida")
                .setAllowedOriginPatterns("*");
    }
}
