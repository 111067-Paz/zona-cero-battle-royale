package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import lombok.Getter;
import lombok.Setter;

/**
 * Estado mutable POR BOT que los estados de la FSM leen y escriben (rumbo de merodeo, contadores). Lo
 * sostiene el {@link ComportamientoFsm} de cada bot, lo que permite que los {@link EstadoComportamiento}
 * sean singletons stateless (sin asignacion por tick).
 */
@Getter
@Setter
public class MemoriaBot {

    private Vector2 direccionMerodeo = Vector2.CERO;
    private int ticksHastaCambioRumbo = 0;
    private int reaccionRestante;

    public MemoriaBot(int reaccionInicial) {
        this.reaccionRestante = reaccionInicial;
    }
}
