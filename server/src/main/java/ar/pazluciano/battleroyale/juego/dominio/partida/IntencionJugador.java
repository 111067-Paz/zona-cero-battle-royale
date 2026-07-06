package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Getter;

/**
 * Lo que el jugador QUIERE hacer ahora (PLAN §4.1, R4). Estado mutable con semantica last-wins: cada
 * INPUT valido la REEMPLAZA por completo y la simulacion la lee en cada tick.
 *
 * <p>Modelar la intencion (y no impulsos) resuelve el jitter de red: si en un tick llegan 2 inputs
 * gana el ultimo, si llegan 0 se mantiene el anterior. Ni tirones ni dobles aplicaciones.
 */
@Getter
public class IntencionJugador {

    private Vector2 mover = Vector2.CERO;
    private double apuntar = 0.0;
    private boolean disparar = false;

    /** Reemplaza la intencion vigente (last-wins). El {@code mover} se guarda tal cual; el clamp
     *  anti speed-hack lo hace la {@link Partida} al integrarlo, no aca. */
    public void reemplazar(Vector2 mover, double apuntar, boolean disparar) {
        this.mover = mover;
        this.apuntar = apuntar;
        this.disparar = disparar;
    }

    /** Deja al jugador quieto conservando el apuntado. Se usa al desconectar (R26): sigue vivo y
     *  vulnerable, pero no se mueve solo. */
    public void detener() {
        this.mover = Vector2.CERO;
        this.disparar = false;
    }
}
