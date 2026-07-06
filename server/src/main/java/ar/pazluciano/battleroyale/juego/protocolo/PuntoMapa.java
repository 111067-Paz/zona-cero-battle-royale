package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Punto del mapa en coordenadas de mundo. Se usa para los spawns en la definicion cargada (dato
 * server-side; NO viaja en la respuesta REST al cliente).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PuntoMapa {

    private double x;
    private double y;
}
