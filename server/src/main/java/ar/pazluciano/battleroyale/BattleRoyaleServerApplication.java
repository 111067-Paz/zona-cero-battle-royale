package ar.pazluciano.battleroyale;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class BattleRoyaleServerApplication {

	public static void main(String[] args) {
		// Fija la JVM a hora argentina ANTES de que arranque Spring (auditoria de plataforma, F5).
		// No afecta al loop del juego: la simulacion usa System.nanoTime(), nunca reloj de pared (§2.7).
		TimeZone.setDefault(TimeZone.getTimeZone("America/Argentina/Buenos_Aires"));
		SpringApplication.run(BattleRoyaleServerApplication.class, args);
	}

}
