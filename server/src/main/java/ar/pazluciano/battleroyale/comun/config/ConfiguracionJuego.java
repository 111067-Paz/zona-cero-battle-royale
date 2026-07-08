package ar.pazluciano.battleroyale.comun.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Constantes de gameplay cargadas desde application.yml bajo el prefijo "juego" (PLAN §1.3).
 *
 * <p>Es la unica fuente de verdad de los tunables: el dominio los recibe inyectados y el cliente
 * los recibe en BIENVENIDA. Nunca se duplican hardcodeados ni con {@code @Value} disperso.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "juego")
public class ConfiguracionJuego {

    /** Ticks de simulacion por segundo. El paso de integracion {@link #dt()} se deriva de aca. */
    private int tickRate;

    /** Snapshots enviados por segundo. Debe dividir a {@link #tickRate} de forma exacta. */
    private int snapshotRate;

    /** Cupo total de jugadores por partida (humanos + bots). */
    private int jugadoresPorPartida;

    /** Lado del mundo cuadrado, en unidades. El area jugable es {@code [0, mundo] x [0, mundo]}. */
    private int mundo;

    /** Radio de colision del jugador, en unidades. */
    private double radioJugador;

    /** Velocidad de desplazamiento del jugador, en unidades por segundo. */
    private double velocidadJugador;

    /** Puntos de vida iniciales. */
    private int vida;

    /** Cantidad de bots con que se llena la partida local en dev (tunable, no hardcodeado). */
    private int botsLocales;

    /** Paso de integracion fijo, en segundos. El loop jamas usa el reloj de pared para fisica. */
    public double dt() {
        return 1.0 / tickRate;
    }

    /** Cada cuantos ticks se emite un snapshot. Con 30 ticks y 15 snapshots, es 1 cada 2. */
    public int ticksPorSnapshot() {
        return tickRate / snapshotRate;
    }
}
