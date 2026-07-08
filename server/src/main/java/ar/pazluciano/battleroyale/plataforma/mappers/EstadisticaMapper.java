package ar.pazluciano.battleroyale.plataforma.mappers;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import org.springframework.stereotype.Component;

@Component
public class EstadisticaMapper {

    public EstadisticaDTO toDTO(EstadisticaJugador entity) {
        return EstadisticaDTO.builder()
                .nombreUsuario(entity.getUsuario().getNombreUsuario())
                .partidasJugadas(entity.getPartidasJugadas())
                .victorias(entity.getVictorias())
                .kills(entity.getKills())
                .muertes(entity.getMuertes())
                .top3(entity.getTop3())
                .kd(kd(entity))
                .build();
    }

    /** kills / max(1, muertes) — R38: nunca divide por cero con 0 muertes. */
    private double kd(EstadisticaJugador entity) {
        return entity.getKills() / (double) Math.max(1, entity.getMuertes());
    }
}
