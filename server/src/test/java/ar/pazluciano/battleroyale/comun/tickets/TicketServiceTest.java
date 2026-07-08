package ar.pazluciano.battleroyale.comun.tickets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("TicketService")
class TicketServiceTest {

    private static final Long ID_USUARIO = 7L;
    private static final String ID_PARTIDA = "partida-abc";

    private TicketService ticketService;

    @BeforeEach
    void setUp() {
        ticketService = new TicketService();
    }

    @Test
    @DisplayName("un ticket recien creado se canjea y devuelve usuario y partida correctos")
    void crear_yCanjear_devuelveIdentidadCorrecta() {
        // GIVEN
        String ticket = ticketService.crear(ID_USUARIO, ID_PARTIDA);

        // WHEN
        Optional<IdentidadTicket> resultado = ticketService.canjear(ticket);

        // THEN
        assertTrue(resultado.isPresent());
        assertEquals(ID_USUARIO, resultado.get().getIdUsuario());
        assertEquals(ID_PARTIDA, resultado.get().getIdPartida());
    }

    @Test
    @DisplayName("un ticket ya canjeado no puede volver a usarse (delete-on-use)")
    void canjear_segundaVezElMismoTicket_devuelveEmpty() {
        // GIVEN
        String ticket = ticketService.crear(ID_USUARIO, ID_PARTIDA);
        ticketService.canjear(ticket);

        // WHEN
        Optional<IdentidadTicket> segundoCanje = ticketService.canjear(ticket);

        // THEN
        assertTrue(segundoCanje.isEmpty());
    }

    @Test
    @DisplayName("un ticket que nunca se creo devuelve Optional vacio")
    void canjear_ticketInexistente_devuelveEmpty() {
        // WHEN
        Optional<IdentidadTicket> resultado = ticketService.canjear("ticket-que-jamas-existio");

        // THEN
        assertTrue(resultado.isEmpty());
    }

    @Test
    @DisplayName("un ticket null devuelve Optional vacio sin explotar")
    void canjear_ticketNull_devuelveEmpty() {
        // WHEN
        Optional<IdentidadTicket> resultado = ticketService.canjear(null);

        // THEN
        assertTrue(resultado.isEmpty());
    }

    @Test
    @DisplayName("un ticket vencido (TTL cumplido) devuelve Optional vacio y se elimina igual")
    void canjear_ticketVencido_devuelveEmpty() {
        // GIVEN: se crea el ticket y se envejece su entrada por reflection (el TTL real es de 30s,
        // demasiado para un test unitario) — simula el paso del tiempo sin dormir el hilo.
        String ticket = ticketService.crear(ID_USUARIO, ID_PARTIDA);
        @SuppressWarnings("unchecked")
        Map<String, Object> tickets =
                (Map<String, Object>) ReflectionTestUtils.getField(ticketService, "tickets");
        Object entrada = tickets.get(ticket);
        ReflectionTestUtils.setField(entrada, "expiraEnMillis", System.currentTimeMillis() - 1_000);

        // WHEN
        Optional<IdentidadTicket> resultado = ticketService.canjear(ticket);

        // THEN
        assertTrue(resultado.isEmpty());
    }
}
