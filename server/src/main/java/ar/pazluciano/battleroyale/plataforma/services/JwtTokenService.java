package ar.pazluciano.battleroyale.plataforma.services;

import ar.pazluciano.battleroyale.plataforma.entities.Usuario;

import java.util.Optional;

public interface JwtTokenService {

    /** Access token de corta duracion (PLAN §4.2). Claims: subject=id, username. */
    String generarAccessToken(Usuario usuario);

    /** Vacio si el token es invalido, expirado o esta mal firmado. */
    Optional<Long> validarYExtraerIdUsuario(String token);
}
