package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.exceptions.TokenInvalidoException;
import ar.pazluciano.battleroyale.plataforma.mappers.EstadisticaMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.EstadisticaJugadorRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import ar.pazluciano.battleroyale.plataforma.services.EstadisticaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lee estadisticas acumuladas (PLAN §15.2). Con Lazy Initialization defensiva si falta la fila
 * y conversion a TokenInvalidoException (HTTP 401) si el usuario en el token ya no existe.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EstadisticaServiceImpl implements EstadisticaService {

    private final EstadisticaJugadorRepository estadisticaJugadorRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstadisticaMapper estadisticaMapper;

    @Override
    @Transactional
    public EstadisticaDTO misEstadisticas(Long idUsuario) {
        EstadisticaJugador estadistica = estadisticaJugadorRepository.findByUsuarioId(idUsuario)
                .orElseGet(() -> {
                    Usuario usuario = usuarioRepository.findById(idUsuario)
                            .orElseThrow(() -> new TokenInvalidoException("Sesión invalida o usuario no encontrado: " + idUsuario));
                    return estadisticaJugadorRepository.save(new EstadisticaJugador(usuario));
                });
        return estadisticaMapper.toDTO(estadistica);
    }

    @Override
    public Page<EstadisticaDTO> ranking(Pageable pageable) {
        return estadisticaJugadorRepository.findAllByOrderByVictoriasDescKillsDesc(pageable)
                .map(estadisticaMapper::toDTO);
    }
}
