package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Builder;
import lombok.Value;

/**
 * Duraciones del ciclo de vida de la partida, en TICKS (PLAN §4.3). Value object del dominio: el
 * motor las deriva de {@code ConfiguracionJuego} (segundos, configurables) para que el dominio siga
 * sin conocer Spring. Nada hardcodeado: el ritmo de partida se ajusta por configuracion.
 */
@Value
@Builder
public class ParametrosCiclo {

    /** Ticks en EN_LOBBY antes de pasar a CUENTA_REGRESIVA (timeout fijo en modo local, F4). */
    int lobbyTimeoutTicks;

    /** Ticks de cuenta regresiva antes de EN_CURSO. */
    int cuentaRegresivaTicks;

    /** Ticks de gracia en FINALIZADA antes de que el GestorPartidas desregistre la partida. */
    int graciaFinTicks;
}
