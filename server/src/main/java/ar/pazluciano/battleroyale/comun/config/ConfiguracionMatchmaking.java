package ar.pazluciano.battleroyale.comun.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cola de matchmaking (PLAN §5.5/§10-F6, R6). Aparte de {@link ConfiguracionJuego} a proposito:
 * el timeout de la COLA es un concern de emparejamiento, no de la simulacion de una partida ya
 * creada — mismo criterio que separo {@link ConfiguracionJwt} de la config de gameplay.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "juego.matchmaking")
public class ConfiguracionMatchmaking {

    /** Segundos que espera un lote antes de completarse con bots (R6). */
    private int timeoutSegundos;

    public long timeoutMillis() {
        return timeoutSegundos * 1000L;
    }
}
