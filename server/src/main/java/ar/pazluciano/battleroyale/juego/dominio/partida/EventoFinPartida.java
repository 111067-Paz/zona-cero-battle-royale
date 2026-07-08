package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Value;

/** La partida termino: viaja UNA sola vez (flag en Partida), con el podio (ganador + kills). */
@Value
public class EventoFinPartida implements EventoDominio {

    ResultadoFinal resultado;
}
