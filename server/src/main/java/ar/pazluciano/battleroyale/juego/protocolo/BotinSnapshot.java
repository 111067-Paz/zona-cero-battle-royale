package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Vista por VALOR de un botin disponible en el mapa (PLAN §5.2). Solo se listan los DISPONIBLES. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BotinSnapshot {

    private long id;
    private String tipo;
    private double x;
    private double y;
}
