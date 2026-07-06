package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Respuesta de {@code GET /api/mapas/{id}} (PLAN §5.2): el mapa estatico que el cliente baja UNA vez
 * al recibir BIENVENIDA para dibujar el fondo. Lleva lo que el cliente NECESITA para renderizar
 * (dimensiones, obstaculos, decoracion) y NADA mas: los spawns quedan server-side.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapaDto {

    private String id;
    private double ancho;
    private double alto;
    private List<RectanguloMapa> obstaculos;
    private List<DecoracionMapa> decoraciones;
}
