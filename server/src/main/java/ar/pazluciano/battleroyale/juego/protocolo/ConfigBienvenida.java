package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Subconjunto de constantes que el cliente necesita para no hardcodear nada (PLAN §5.2). Viaja
 * dentro de {@link Bienvenida}. El cliente calcula dt, la conversion ticks->segundos del HUD y el
 * clamp visual de velocidad a partir de estos valores.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigBienvenida {

    private int tickRate;
    private int snapshotRate;
    private int mundo;
    private double velocidad;

    /** Radio de colision del jugador (F7): la base de la prediccion client-side lo necesita para
     *  correr LA MISMA resolucion de colisiones que el servidor (§8.6). */
    private double radioJugador;
}
