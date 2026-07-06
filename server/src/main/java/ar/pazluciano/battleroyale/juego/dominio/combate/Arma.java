package ar.pazluciano.battleroyale.juego.dominio.combate;

import java.util.List;
import java.util.Random;

/**
 * Arma como Strategy (PLAN §6). Cada implementacion define cuantos proyectiles produce un disparo, su
 * dispersion, dano y velocidad, y su cadencia (cooldown en ticks). La lista de armas VA a crecer:
 * agregar una es una clase nueva, sin tocar la logica de combate (Open/Closed).
 *
 * <p>Recibe el {@link Random} sembrado de la partida para la dispersion, de modo que el disparo sea
 * deterministico (misma semilla -> misma dispersion).
 */
public interface Arma {

    /** Proyectiles que genera un disparo desde el angulo dado. Uno para la pistola, varios (con
     *  dispersion) para la escopeta. */
    List<EspecificacionDisparo> disparar(double angulo, Random rng);

    /** Ticks de enfriamiento entre disparos. El server los cuenta: la cadencia es server-side. */
    int cadenciaTicks();

    /** Tipo del arma, para el snapshot. */
    TipoArma tipo();
}
