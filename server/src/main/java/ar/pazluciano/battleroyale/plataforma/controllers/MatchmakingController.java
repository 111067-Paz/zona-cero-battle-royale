package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.juego.motor.ActorMatchmaking;
import ar.pazluciano.battleroyale.juego.motor.EstadoCola;
import ar.pazluciano.battleroyale.plataforma.dtos.EstadoMatchmakingDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cola de matchmaking (PLAN §5.5/§10-F6, Flujo G). El usuario sale SIEMPRE del token autenticado —
 * jamas de un parametro que el cliente pudiera falsear (mismo criterio que {@link TicketController}).
 */
@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final ActorMatchmaking actorMatchmaking;

    @PostMapping("/cola")
    public ResponseEntity<Void> encolar(@AuthenticationPrincipal Long idUsuario) {
        actorMatchmaking.encolar(idUsuario);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/estado")
    public ResponseEntity<EstadoMatchmakingDTO> estado(@AuthenticationPrincipal Long idUsuario) {
        EstadoCola estado = actorMatchmaking.consultarEstado(idUsuario);
        return ResponseEntity.ok(EstadoMatchmakingDTO.builder()
                .enCola(estado.isEnCola())
                .jugadoresEncontrados(estado.getJugadoresEncontrados())
                .idPartida(estado.getIdPartida())
                .build());
    }
}
