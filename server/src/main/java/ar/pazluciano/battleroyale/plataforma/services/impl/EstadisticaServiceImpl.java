package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import ar.pazluciano.battleroyale.plataforma.mappers.EstadisticaMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.EstadisticaJugadorRepository;
import ar.pazluciano.battleroyale.plataforma.services.EstadisticaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lee estadisticas acumuladas (PLAN §15.2). Sin escritura aca: el UPDATE atomico vive en
 * {@code ResultadoPartidaListener}, la unica ruta que muta {@link EstadisticaJugador} (R13).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EstadisticaServiceImpl implements EstadisticaService {

    private final EstadisticaJugadorRepository estadisticaJugadorRepository;
    private final EstadisticaMapper estadisticaMapper;

    @Override
    public EstadisticaDTO misEstadisticas(Long idUsuario) {
        EstadisticaJugador estadistica = estadisticaJugadorRepository.findByUsuarioId(idUsuario)
                .orElseThrow(() -> new IllegalStateException(
                        "Usuario autenticado sin fila de estadisticas: " + idUsuario));
        return estadisticaMapper.toDTO(estadistica);
    }

    @Override
    public Page<EstadisticaDTO> ranking(Pageable pageable) {
        return estadisticaJugadorRepository.findAllByOrderByVictoriasDescKillsDesc(pageable)
                .map(estadisticaMapper::toDTO);
    }
}
