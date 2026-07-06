package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Hecho puntual del juego que el cliente no debe "descubrir" comparando snapshots: kill feed,
 * sonidos, fin de partida (PLAN §5.2). Viaja SEPARADO del snapshot y DESPUES de el (R22).
 *
 * <p>El discriminador {@code evento} (KILL | MUERTE_ZONA | ZONA_CAMBIO | RECOGIDO | FIN_PARTIDA...) y
 * el {@code datos} generico dejan crecer el conjunto de eventos sin romper el contrato. Fase 2: solo
 * KILL, con {@code datos = {asesino, victima, arma}}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Evento {

    @Builder.Default
    private int v = 1;

    @Builder.Default
    private String tipo = "EVENTO";

    /** Clase de evento. Fase 2: "KILL". */
    private String evento;

    /** Carga del evento. Para KILL: asesino, victima, arma (todos strings). */
    private Map<String, String> datos;
}
