package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.combate.TipoArma;
import lombok.Value;

/**
 * Hecho puntual: un jugador mato a otro (PLAN §5.2). Lo produce la simulacion dentro del tick y lo
 * consume el motor para emitir un EVENTO KILL DESPUES del snapshot (R22). Lleva el arma con la que se
 * disparo el proyectil, no el arma actual del asesino (por si hubo swap entre el disparo y el impacto).
 *
 * <p>Vive en {@code dominio.partida} (no en {@code dominio.combate}, donde nacio en la Fase 2) porque
 * las clases permitidas de una interfaz {@code sealed} deben estar en el MISMO PAQUETE cuando el
 * proyecto no tiene {@code module-info.java} (modulo sin nombre): {@link EventoDominio} vive aca.
 */
@Value
public class EventoKill implements EventoDominio {

    String idAsesino;
    String idVictima;
    TipoArma arma;
}
