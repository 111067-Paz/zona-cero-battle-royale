package ar.pazluciano.battleroyale.juego.dominio.combate;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Escopeta: varios perdigones por disparo con dispersion angular, cadencia lenta. Letal de cerca
 * (todos los perdigones aciertan), debil de lejos (se abren). La dispersion sale del RNG sembrado de
 * la partida, asi que es deterministica.
 */
public class Escopeta implements Arma {

    private static final int CADENCIA_TICKS = 24;      // ~1.25 disparos/s
    private static final double VELOCIDAD = 70.0;      // u/s
    private static final int DANO_PERDIGON = 12;       // 6 perdigones = 72 de cerca
    private static final int PERDIGONES = 6;
    private static final double DISPERSION = 0.20;     // semiapertura en radianes

    @Override
    public List<EspecificacionDisparo> disparar(double angulo, Random rng) {
        List<EspecificacionDisparo> perdigones = new ArrayList<>(PERDIGONES);
        for (int i = 0; i < PERDIGONES; i++) {
            double desvio = (rng.nextDouble() * 2.0 - 1.0) * DISPERSION;
            perdigones.add(EspecificacionDisparo.builder()
                    .angulo(angulo + desvio)
                    .velocidad(VELOCIDAD)
                    .dano(DANO_PERDIGON)
                    .build());
        }
        return perdigones;
    }

    @Override
    public int cadenciaTicks() {
        return CADENCIA_TICKS;
    }

    @Override
    public TipoArma tipo() {
        return TipoArma.ESCOPETA;
    }
}
