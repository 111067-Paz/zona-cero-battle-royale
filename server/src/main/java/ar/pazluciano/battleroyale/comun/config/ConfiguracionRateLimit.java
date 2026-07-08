package ar.pazluciano.battleroyale.comun.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Rate limit simple de {@code /api/auth/login} (MVP en memoria, no distribuido). */
@Getter
@Setter
@ConfigurationProperties(prefix = "juego.rate-limit")
public class ConfiguracionRateLimit {

    private int intentosMaximos;
    private int ventanaMinutos;
}
