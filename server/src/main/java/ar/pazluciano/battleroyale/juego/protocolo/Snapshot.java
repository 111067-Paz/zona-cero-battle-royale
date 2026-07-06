package ar.pazluciano.battleroyale.juego.protocolo;

import ar.pazluciano.battleroyale.juego.dominio.partida.EstadoPartida;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Estado del mundo en un tick (PLAN §5.2). Se construye como copia por VALOR dentro del tick, se
 * serializa UNA vez y se emite a todas las sesiones. Snapshot completo (no delta) hasta la Fase 7.
 *
 * <p>Fase 0: solo {@code jugadores}. Los campos {@code estado} (R27) y {@code acks} (R3, habilita la
 * prediccion de la Fase 7) viajan desde ya para fijar el contrato. Proyectiles, botines y zona se
 * agregan en sus fases como campos nuevos, sin romper a los clientes existentes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Snapshot {

    /** Version del protocolo. Siempre 1 en v1. */
    @Builder.Default
    private int v = 1;

    /** Discriminador. Siempre "SNAPSHOT". */
    @Builder.Default
    private String tipo = "SNAPSHOT";

    /** Numero de tick que representa este snapshot. El cliente descarta los {@code <=} al ultimo. */
    private long tick;

    /** Fase de la partida, para que el cliente sepa que pantalla renderizar (R27). */
    private EstadoPartida estado;

    /** Tick en que la partida entro en EN_CURSO; deja calcular el TIME del HUD tras reconexion (R27). */
    private long tickInicio;

    /** Ultima {@code sec} procesada por cada jugador. Habilita la prediccion de la Fase 7 (R3). */
    private Map<String, Long> acks;

    /** Jugadores visibles, copia por valor. */
    private List<JugadorSnapshot> jugadores;

    /** Proyectiles en vuelo, copia por valor. Cada {@code id} es un idRed jamas reciclado (R2). */
    private List<ProyectilSnapshot> proyectiles;
}
