package ar.pazluciano.battleroyale.juego.dominio.combate;

import java.util.List;
import java.util.Random;

/**
 * Arma inicial (R17): un proyectil por disparo, cadencia media, sin dispersion. El arma con la que
 * nace todo jugador hasta que lootee otra (F4).
 */
public class Pistola implements Arma {

    private static final int CADENCIA_TICKS = 9;   // ~3.3 disparos/s a 30 ticks
    private static final double VELOCIDAD = 80.0;  // u/s
    private static final int DANO = 20;            // 5 impactos matan (100 HP)

    @Override
    public List<EspecificacionDisparo> disparar(double angulo, Random rng) {
        return List.of(EspecificacionDisparo.builder()
                .angulo(angulo)
                .velocidad(VELOCIDAD)
                .dano(DANO)
                .build());
    }

    @Override
    public int cadenciaTicks() {
        return CADENCIA_TICKS;
    }

    @Override
    public TipoArma tipo() {
        return TipoArma.PISTOLA;
    }
}
