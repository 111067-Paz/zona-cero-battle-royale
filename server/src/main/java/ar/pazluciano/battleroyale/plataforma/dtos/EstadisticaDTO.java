package ar.pazluciano.battleroyale.plataforma.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Estadisticas de un jugador para el panel de {@code /lobby} (PLAN §15.2). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstadisticaDTO {

    private String nombreUsuario;
    private int partidasJugadas;
    private int victorias;
    private int kills;
    private int muertes;
    private int top3;

    /** kills / max(1, muertes) — R38: nunca divide por cero con 0 muertes. */
    private double kd;
}
