package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.services.EstadisticaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Estadisticas para el panel de {@code /lobby} (PLAN §15.2). El {@code idUsuario} de "mias" sale
 * del principal ya validado por {@link ar.pazluciano.battleroyale.comun.seguridad.JwtAuthenticationFilter}
 * — nunca de un path variable, para que nadie pueda leer las estadisticas de otro usuario.
 */
@RestController
@RequestMapping("/api/estadisticas")
@RequiredArgsConstructor
public class EstadisticaController {

    private final EstadisticaService estadisticaService;

    @GetMapping("/mias")
    public ResponseEntity<EstadisticaDTO> misEstadisticas(Authentication authentication) {
        Long idUsuario = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(estadisticaService.misEstadisticas(idUsuario));
    }

    @GetMapping("/ranking")
    public ResponseEntity<Page<EstadisticaDTO>> ranking(Pageable pageable) {
        return ResponseEntity.ok(estadisticaService.ranking(pageable));
    }
}
