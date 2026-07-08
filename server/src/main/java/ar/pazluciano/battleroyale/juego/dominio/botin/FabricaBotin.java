package ar.pazluciano.battleroyale.juego.dominio.botin;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;

/**
 * Fabrica el {@link TipoBotin} de un spawn segun una tabla de probabilidades, con el RNG sembrado de
 * la partida (deterministico). Es Factory Method (PLAN §6): crea UN producto y decide su variante
 * concreta internamente; no hay familias que mantener coherentes entre si (a diferencia del Abstract
 * Factory de los bots), asi que este es el patron correcto para el problema.
 */
public class FabricaBotin {

    private static final Map<TipoBotin, Double> TABLA_PESOS = new LinkedHashMap<>();

    static {
        TABLA_PESOS.put(TipoBotin.BOTIQUIN, 0.55);
        TABLA_PESOS.put(TipoBotin.PISTOLA, 0.15);
        TABLA_PESOS.put(TipoBotin.ESCOPETA, 0.15);
        TABLA_PESOS.put(TipoBotin.RIFLE, 0.15);
    }

    private static final double PESO_TOTAL =
            TABLA_PESOS.values().stream().mapToDouble(Double::doubleValue).sum();

    public Botin crear(long id, Vector2 posicion, Random rng) {
        double sorteo = rng.nextDouble() * PESO_TOTAL;
        double acumulado = 0.0;
        for (Map.Entry<TipoBotin, Double> entrada : TABLA_PESOS.entrySet()) {
            acumulado += entrada.getValue();
            if (sorteo <= acumulado) {
                return new Botin(id, posicion, entrada.getKey());
            }
        }
        return new Botin(id, posicion, TipoBotin.BOTIQUIN); // fallback defensivo (redondeo de doubles)
    }
}
