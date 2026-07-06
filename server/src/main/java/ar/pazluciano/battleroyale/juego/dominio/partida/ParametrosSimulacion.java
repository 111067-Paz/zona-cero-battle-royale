package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Builder;
import lombok.Value;

/**
 * Constantes de fisica que la {@link Partida} necesita, como value object del DOMINIO.
 *
 * <p>Existe para que el dominio NO importe {@code ConfiguracionJuego} (que lleva anotaciones de
 * Spring): el motor lee la config del framework y construye estos parametros planos para inyectarlos.
 * Asi la simulacion sigue siendo un POJO puro y testeable sin contexto de Spring.
 */
@Value
@Builder
public class ParametrosSimulacion {

    /** Paso de integracion fijo, en segundos (1 / tickRate). */
    double dt;

    /** Lado del mundo cuadrado, en unidades. Area jugable: {@code [0, mundo] x [0, mundo]}. */
    int mundo;

    /** Radio de colision del jugador, en unidades. */
    double radioJugador;

    /** Velocidad de desplazamiento del jugador, en unidades por segundo. */
    double velocidadJugador;

    /** Vida inicial con la que nace un jugador. */
    int vidaInicial;
}
