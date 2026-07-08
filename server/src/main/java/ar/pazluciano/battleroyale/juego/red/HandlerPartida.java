package ar.pazluciano.battleroyale.juego.red;

import ar.pazluciano.battleroyale.comun.tickets.IdentidadTicket;
import ar.pazluciano.battleroyale.comun.tickets.TicketService;
import ar.pazluciano.battleroyale.juego.motor.Comando;
import ar.pazluciano.battleroyale.juego.motor.ComandoDesconexion;
import ar.pazluciano.battleroyale.juego.motor.ComandoInput;
import ar.pazluciano.battleroyale.juego.motor.ComandoSalir;
import ar.pazluciano.battleroyale.juego.motor.ComandoUnirse;
import ar.pazluciano.battleroyale.juego.motor.GameLoop;
import ar.pazluciano.battleroyale.juego.motor.GestorPartidas;
import ar.pazluciano.battleroyale.juego.protocolo.Input;
import ar.pazluciano.battleroyale.juego.protocolo.MensajeCliente;
import ar.pazluciano.battleroyale.juego.protocolo.Salir;
import ar.pazluciano.battleroyale.juego.protocolo.Unirse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Handler crudo del WebSocket de juego (PLAN §7-C). Corre en el pool del contenedor y tiene UNA sola
 * responsabilidad: parsear, validar la FORMA del mensaje y ENCOLAR un comando en el loop de la
 * partida. JAMAS muta estado de juego ni llama al dominio.
 *
 * <p>Defensas de §5.3 activas en la Fase 0: version de protocolo, y strikes por JSON malformado o
 * tipo desconocido (3 -> cierre). El rate limit por conexion y el timeout de heartbeat server-side
 * se agregan en fases de multijugador, cuando el cliente es realmente remoto.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HandlerPartida extends TextWebSocketHandler {

    private static final int VERSION_PROTOCOLO = 1;
    private static final int MAX_STRIKES = 3;

    /** Limites del decorator (R5): 5 s de tiempo de envio, 512 KB de buffer por sesion. */
    private static final int LIMITE_ENVIO_MS = 5_000;
    private static final int LIMITE_BUFFER_BYTES = 512 * 1024;

    private final GestorPartidas gestorPartidas;
    private final ObjectMapper objectMapper;
    private final TicketService ticketService;

    /** Sesiones ya unidas, indexadas por id de sesion WS. */
    private final Map<String, SesionWebSocket> jugadores = new ConcurrentHashMap<>();

    /** Contador de strikes por sesion cruda (aun sin unirse). */
    private final Map<String, Integer> strikes = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        strikes.put(session.getId(), 0);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        MensajeCliente mensaje = parsear(session, message);
        if (mensaje == null) {
            return;
        }
        if (mensaje.getV() != VERSION_PROTOCOLO) {
            cerrar(session, CloseStatus.NOT_ACCEPTABLE.withReason("version de protocolo no soportada"));
            return;
        }
        switch (mensaje) {
            case Unirse unirse -> manejarUnirse(session, unirse);
            case Input input -> manejarInput(session, input);
            case Salir salir -> manejarSalir(session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        strikes.remove(session.getId());
        SesionWebSocket sesion = jugadores.remove(session.getId());
        if (sesion != null) {
            encolarEnSuLoop(sesion, new ComandoDesconexion(sesion.idJugador()));
        }
    }

    private MensajeCliente parsear(WebSocketSession session, TextMessage message) {
        try {
            return objectMapper.readValue(message.getPayload(), MensajeCliente.class);
        } catch (JacksonException e) {
            registrarStrike(session);
            return null;
        }
    }

    /**
     * Canjea el ticket (delete-on-use, R1) y deriva un {@code idJugador} ESTABLE del usuario
     * autenticado (no un UUID random como en las Fases 0-4): asi una reconexion con un ticket
     * nuevo mapea a la MISMA plaza en la partida (R7/R26), habilitando la reanudacion. El ticket
     * tambien dice A QUE PARTIDA (F6, multi-partida): la asigno el actor de matchmaking.
     */
    private void manejarUnirse(WebSocketSession session, Unirse unirse) {
        if (jugadores.containsKey(session.getId())) {
            return;
        }
        Optional<IdentidadTicket> identidad = ticketService.canjear(unirse.getTicket());
        if (identidad.isEmpty()) {
            cerrar(session, CloseStatus.NOT_ACCEPTABLE.withReason("ticket invalido o vencido"));
            return;
        }
        Optional<GameLoop> loop = gestorPartidas.buscarLoop(identidad.get().getIdPartida());
        if (loop.isEmpty()) {
            cerrar(session, CloseStatus.NOT_ACCEPTABLE.withReason("partida no encontrada o ya finalizada"));
            return;
        }
        String idJugador = "u-" + identidad.get().getIdUsuario();
        WebSocketSession decorada =
                new ConcurrentWebSocketSessionDecorator(session, LIMITE_ENVIO_MS, LIMITE_BUFFER_BYTES);
        SesionWebSocket sesion = new SesionWebSocket(idJugador, identidad.get().getIdPartida(), decorada);
        jugadores.put(session.getId(), sesion);
        loop.get().encolar(new ComandoUnirse(sesion));
    }

    private void manejarInput(WebSocketSession session, Input input) {
        SesionWebSocket sesion = jugadores.get(session.getId());
        if (sesion == null) {
            return;
        }
        encolarEnSuLoop(sesion, new ComandoInput(sesion.idJugador(), input));
    }

    private void manejarSalir(WebSocketSession session) {
        SesionWebSocket sesion = jugadores.get(session.getId());
        if (sesion == null) {
            return;
        }
        encolarEnSuLoop(sesion, new ComandoSalir(sesion.idJugador()));
    }

    /** Late messages de una partida ya limpiada (R12) se descartan en silencio: no hay a quien avisar. */
    private void encolarEnSuLoop(SesionWebSocket sesion, Comando comando) {
        gestorPartidas.buscarLoop(sesion.idPartida()).ifPresent(loop -> loop.encolar(comando));
    }

    private void registrarStrike(WebSocketSession session) {
        int total = strikes.merge(session.getId(), 1, Integer::sum);
        if (total >= MAX_STRIKES) {
            cerrar(session, CloseStatus.NOT_ACCEPTABLE.withReason("demasiados mensajes invalidos"));
        }
    }

    private void cerrar(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException e) {
            log.warn("No se pudo cerrar la sesion {}: {}", session.getId(), e.getMessage());
        }
    }
}
