package ar.pazluciano.battleroyale.comun.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Bean de hashing de contrasenias (PLAN §4.2). BCrypt con costo 12 (por encima del minimo
 * recomendado). Unico {@code new BCryptPasswordEncoder()} de todo el proyecto: los services
 * reciben el bean por constructor, nunca lo instancian ellos mismos.
 */
@Configuration
public class PasswordEncoderConfig {

    private static final int COSTO_BCRYPT = 12;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(COSTO_BCRYPT);
    }
}
