package ar.pazluciano.battleroyale.comun.tickets;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ticket opaco de un solo uso para unirse al WebSocket (PLAN §5.5, R1). El JWT NUNCA viaja por la
 * query string del socket (quedaria en logs de proxies): {@code POST /api/partidas/ticket}
 * (autenticado) lo genera, y {@code UNIRSE(ticket)} lo canjea, delete-on-use.
 *
 * <p>Vive en {@code comun} a proposito: lo crea {@code plataforma} (autenticado) y lo consume
 * {@code juego/red} (el handler del socket) — ninguno de los dos modulos debe depender del otro,
 * asi que el punto de encuentro es neutral.
 */
@Component
public class TicketService {

    private static final long TTL_MILLIS = 30_000;

    private final Map<String, Entrada> tickets = new ConcurrentHashMap<>();

    public String crear(Long idUsuario, String idPartida, Personaje personaje) {
        String ticket = UUID.randomUUID().toString();
        tickets.put(ticket,
                new Entrada(idUsuario, idPartida, personaje, System.currentTimeMillis() + TTL_MILLIS));
        return ticket;
    }

    /** Delete-on-use: el ticket se consume UNA sola vez, exista o no, valido o vencido. */
    public Optional<IdentidadTicket> canjear(String ticket) {
        if (ticket == null) {
            return Optional.empty();
        }
        Entrada entrada = tickets.remove(ticket);
        if (entrada == null || entrada.getExpiraEnMillis() < System.currentTimeMillis()) {
            return Optional.empty();
        }
        return Optional.of(
                new IdentidadTicket(entrada.getIdUsuario(), entrada.getIdPartida(), entrada.getPersonaje()));
    }

    /** Sweeper (PLAN §3.1): barre tickets vencidos que nadie canjeo, cada minuto. */
    @Scheduled(fixedDelay = 60_000)
    void barrerVencidos() {
        long ahora = System.currentTimeMillis();
        tickets.entrySet().removeIf(entrada -> entrada.getValue().getExpiraEnMillis() < ahora);
    }

    @Getter
    @RequiredArgsConstructor
    private static class Entrada {
        private final Long idUsuario;
        private final String idPartida;
        private final Personaje personaje;
        private final long expiraEnMillis;
    }
}
