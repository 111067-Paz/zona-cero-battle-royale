package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.exceptions.PersonajeInvalidoException;
import ar.pazluciano.battleroyale.plataforma.mappers.UsuarioMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import ar.pazluciano.battleroyale.plataforma.services.PerfilService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Perfil del usuario: hoy solo el personaje elegido (PLAN §15). */
@Service
@RequiredArgsConstructor
public class PerfilServiceImpl implements PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;

    @Override
    @Transactional
    public UsuarioDTO actualizarPersonaje(Long idUsuario, String personaje) {
        Personaje valido = Personaje.desdeTexto(personaje)
                .orElse(Personaje.BARBARROJA);
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new IllegalStateException("Usuario autenticado inexistente: " + idUsuario));
        usuario.setPersonaje(valido);
        return usuarioMapper.toDTO(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public Personaje personajeDe(Long idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .map(Usuario::getPersonaje)
                .orElseThrow(() -> new IllegalStateException("Usuario autenticado inexistente: " + idUsuario));
    }
}
