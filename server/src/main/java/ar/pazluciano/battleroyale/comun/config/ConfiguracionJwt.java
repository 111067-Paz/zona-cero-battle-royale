package ar.pazluciano.battleroyale.comun.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Config de tokens (PLAN §4.2/§5.5, F5). Aparte de {@link ConfiguracionJuego} a proposito: JWT es
 * un concern de {@code plataforma}, no de gameplay — mezclarlos rompe la frontera de modulos (§3.2).
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "juego.jwt")
public class ConfiguracionJwt {

    private String secret;
    private int accessMinutos;
    private int refreshDias;

    public long accessMinutosEnMillis() {
        return accessMinutos * 60_000L;
    }

    public long refreshDiasEnMillis() {
        return refreshDias * 24L * 60 * 60 * 1000;
    }
}
