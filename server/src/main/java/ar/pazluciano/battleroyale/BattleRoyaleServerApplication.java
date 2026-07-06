package ar.pazluciano.battleroyale;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BattleRoyaleServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(BattleRoyaleServerApplication.class, args);
	}

}
