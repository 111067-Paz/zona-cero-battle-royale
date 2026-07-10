package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.comun.tickets.TicketService;
import ar.pazluciano.battleroyale.plataforma.dtos.TicketResponse;
import ar.pazluciano.battleroyale.plataforma.services.PerfilService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Emite el ticket de un solo uso para el WebSocket de juego (PLAN §5.5, R1). El usuario sale
 * SIEMPRE del token autenticado — jamas de un parametro que el cliente pudiera falsear. La
 * partida SI la indica el cliente (F6): ya la conoce por el {@code idPartida} que le devolvio el
 * polling de matchmaking.
 */
@RestController
@RequestMapping("/api/partidas")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final PerfilService perfilService;

    @PostMapping("/ticket")
    public ResponseEntity<TicketResponse> crearTicket(@AuthenticationPrincipal Long idUsuario,
            @RequestParam String idPartida) {
        String ticket = ticketService.crear(idUsuario, idPartida, perfilService.personajeDe(idUsuario));
        return ResponseEntity.ok(TicketResponse.builder().ticket(ticket).build());
    }
}
