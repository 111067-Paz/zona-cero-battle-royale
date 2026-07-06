package ar.pazluciano.battleroyale.juego.dominio.combate;

import lombok.Value;

/**
 * Hecho puntual: un jugador mato a otro (PLAN §5.2). Lo produce la simulacion dentro del tick y lo
 * consume el motor para emitir un EVENTO KILL DESPUES del snapshot (R22). Lleva el arma con la que se
 * disparo el proyectil, no el arma actual del asesino (por si hubo swap entre el disparo y el impacto).
 */
@Value
public class EventoKill {

    String idAsesino;
    String idVictima;
    TipoArma arma;
}
