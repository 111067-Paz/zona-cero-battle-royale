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

    // ---- Ciclo de partida (F4, PLAN §4.3). En SEGUNDOS: el ritmo de partida se ajusta ENTERO por
    // config, sin tocar codigo — "que pueda seleccionar el tiempo de partida". ----

    /** Segundos en EN_LOBBY antes de CUENTA_REGRESIVA (timeout fijo en modo local). */
    private int lobbyTimeoutSegundos;

    /** Segundos de cuenta regresiva antes de EN_CURSO. */
    private int cuentaRegresivaSegundos;

    /** Segundos de gracia en FINALIZADA antes de desregistrar la partida. */
    private int graciaFinSegundos;

    // ---- Zona segura (F4, PLAN §7-E). Tambien en segundos/unidades configurables. ----

    /** Radio de la zona al arrancar EN_CURSO. */
    private double zonaRadioInicial;

    /** Radio final, al cabo de todas las contracciones. */
    private double zonaRadioMinimo;

    /** Cantidad de contracciones hasta el radio minimo. */
    private int zonaCantidadFases;

    /** Segundos que dura CADA contraccion. */
    private int zonaContraccionSegundos;

    /** Segundos de espera entre el fin de una contraccion y el inicio de la siguiente. */
    private int zonaEsperaSegundos;

    /** Dano por segundo a quien esta fuera del circulo (acumulador fraccional, §7-E). */
    private double zonaDanioPorSegundo;

    /** Paso de integracion fijo, en segundos. El loop jamas usa el reloj de pared para fisica. */
    public double dt() {
        return 1.0 / tickRate;
    }

    /** Cada cuantos ticks se emite un snapshot. Con 30 ticks y 15 snapshots, es 1 cada 2. */
    public int ticksPorSnapshot() {
        return tickRate / snapshotRate;
    }

    public int lobbyTimeoutTicks() {
        return lobbyTimeoutSegundos * tickRate;
    }

    public int cuentaRegresivaTicks() {
        return cuentaRegresivaSegundos * tickRate;
    }

    public int graciaFinTicks() {
        return graciaFinSegundos * tickRate;
    }

    public int zonaContraccionTicks() {
        return zonaContraccionSegundos * tickRate;
    }

    public int zonaEsperaTicks() {
        return zonaEsperaSegundos * tickRate;
    }
}
