package ar.pazluciano.battleroyale.juego.motor.mapa;

import ar.pazluciano.battleroyale.juego.protocolo.DecoracionMapa;
import ar.pazluciano.battleroyale.juego.protocolo.PuntoMapa;
import ar.pazluciano.battleroyale.juego.protocolo.RectanguloMapa;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Definicion completa de un mapa tal como se lee del JSON en {@code resources/mapas/*.json}.
 *
 * <p>Es la representacion de CARGA: incluye los {@code spawns} (dato server-side). De aca se derivan
 * dos vistas: el {@code MapaJuego} del dominio (obstaculos + spawns + dimensiones, para la
 * simulacion) y el {@code MapaDto} del wire (sin spawns, para el cliente).
 */
@Data
@NoArgsConstructor
public class DefinicionMapa {

    private String id;
    private double ancho;
    private double alto;
    private List<RectanguloMapa> obstaculos;
    private List<PuntoMapa> spawns;
    private List<PuntoMapa> spawnsBotin;
    private List<DecoracionMapa> decoraciones;
}
