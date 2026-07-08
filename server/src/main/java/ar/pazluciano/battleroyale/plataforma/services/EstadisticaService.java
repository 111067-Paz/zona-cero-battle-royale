package ar.pazluciano.battleroyale.plataforma.services;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EstadisticaService {

    EstadisticaDTO misEstadisticas(Long idUsuario);

    Page<EstadisticaDTO> ranking(Pageable pageable);
}
