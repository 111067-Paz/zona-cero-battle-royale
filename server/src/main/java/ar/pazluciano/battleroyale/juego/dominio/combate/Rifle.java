package ar.pazluciano.battleroyale.juego.dominio.combate;

import java.util.List;
import java.util.Random;

/**
 * Rifle: un proyectil muy rapido, cadencia alta, dano por bala moderado. Su velocidad (4 u/tick) es
 * justamente la que exige la colision por SEGMENTO: sin ella atravesaria paredes finas entre ticks.
 */
public class Rifle implements Arma {

    private static final int CADENCIA_TICKS = 4;    // 7.5 disparos/s
    private static final double VELOCIDAD = 120.0;  // u/s (4 u/tick)
    private static final int DANO = 10;

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
        return TipoArma.RIFLE;
    }
}
