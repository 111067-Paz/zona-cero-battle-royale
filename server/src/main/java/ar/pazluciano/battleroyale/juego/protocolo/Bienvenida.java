package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Primer mensaje que el servidor envia a una sesion recien admitida (PLAN §5.2). Le da su identidad
 * ({@code idJugador}), la partida asignada, la config para no hardcodear nada y el id del mapa a
 * bajar por REST. El cliente descarta cualquier SNAPSHOT que llegue antes de esta BIENVENIDA (R25).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bienvenida {

    /** Version del protocolo. Siempre 1 en v1. */
    @Builder.Default
    private int v = 1;

    /** Discriminador. Siempre "BIENVENIDA". */
    @Builder.Default
    private String tipo = "BIENVENIDA";

    private String idJugador;
    private String idPartida;
    private ConfigBienvenida config;
    private String idMapa;
}
