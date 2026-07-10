package ar.pazluciano.battleroyale.plataforma.services;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;

public interface PerfilService {

    /** Valida el texto contra {@link Personaje}, persiste y devuelve el perfil actualizado. */
    UsuarioDTO actualizarPersonaje(Long idUsuario, String personaje);

    /** El personaje YA persistido del usuario (PLAN §15): lo consume {@code TicketController}. */
    Personaje personajeDe(Long idUsuario);
}
