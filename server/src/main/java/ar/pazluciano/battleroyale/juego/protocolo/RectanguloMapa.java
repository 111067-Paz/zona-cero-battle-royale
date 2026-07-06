package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Rectangulo del mapa en coordenadas de mundo (esquina superior-izquierda + tamano). Forma comun
 * para los obstaculos: se usa tanto en la definicion cargada como en la respuesta REST al cliente.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RectanguloMapa {

    private double x;
    private double y;
    private double ancho;
    private double alto;
}
