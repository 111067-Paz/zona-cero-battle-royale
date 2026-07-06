package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Elemento decorativo del mapa SIN colision (R36): rio, flores, etc. Solo lo dibuja el cliente; la
 * simulacion lo ignora por completo. El {@code tipo} le dice al renderer con que sprite/color
 * pintarlo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DecoracionMapa {

    /** Clase de decoracion: RIO | FLOR | ... El cliente decide como dibujarla. */
    private String tipo;

    private double x;
    private double y;
    private double ancho;
    private double alto;
}
