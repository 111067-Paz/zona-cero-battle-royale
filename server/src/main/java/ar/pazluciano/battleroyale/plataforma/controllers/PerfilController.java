package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.plataforma.dtos.ActualizarPersonajeRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;
import ar.pazluciano.battleroyale.plataforma.services.PerfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Perfil del usuario autenticado (PLAN §15): hoy solo el personaje elegido. */
@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
public class PerfilController {

    private final PerfilService perfilService;

    @PutMapping("/personaje")
    public ResponseEntity<UsuarioDTO> actualizarPersonaje(@AuthenticationPrincipal Long idUsuario,
            @Valid @RequestBody ActualizarPersonajeRequest request) {
        return ResponseEntity.ok(perfilService.actualizarPersonaje(idUsuario, request.getPersonaje()));
    }
}
