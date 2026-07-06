package ar.pazluciano.battleroyale.juego.protocolo;

import ar.pazluciano.battleroyale.juego.dominio.partida.AccionJugador;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

/**
 * Intencion de juego del cliente para el instante actual (PLAN §5.1). NO es un impulso: REEMPLAZA
 * la intencion vigente del jugador (semantica last-wins por {@code sec}). El servidor la lee en cada
 * tick; si llegan 2 en un tick gana la de mayor {@code sec}, si llegan 0 sigue la anterior.
 *
 * <p>El servidor re-normaliza {@code mover} (jamas confia en el modulo del vector: anti speed-hack)
 * y valida el cooldown de {@code disparar} en ticks. El flujo constante de INPUT a 30 Hz ES el
 * heartbeat de la conexion.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class Input extends MensajeCliente {

    /** Secuencia monotonica por conexion (arranca en 1). {@code sec <= ultimaSec} -> descarte. */
    private long sec;

    /** Vector de movimiento deseado. El server lo re-normaliza a modulo <= 1 antes de aplicarlo. */
    private VectorMensaje mover;

    /** Angulo de apuntado en radianes. */
    private double apuntar;

    /** Intencion de disparo sostenida. El cooldown lo impone el server, no el cliente. */
    private boolean disparar;

    /** Acciones one-shot de este mensaje (tope 2 por tick por jugador). Vacio en la Fase 0. */
    private List<AccionJugador> acciones;
}
