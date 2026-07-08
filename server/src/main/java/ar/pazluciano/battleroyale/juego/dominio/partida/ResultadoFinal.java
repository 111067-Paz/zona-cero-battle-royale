package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Value;

import java.util.Map;

/**
 * Resultado de una partida terminada (PLAN §5.4/§7-F). Minimo para el MVP local: quien gano y las
 * bajas de cada jugador (para el podio). La persistencia completa (posicion final, dano infligido,
 * ParticipacionPartida) llega con las entidades JPA de la Fase 5.
 */
@Value
public class ResultadoFinal {

    String idGanador;
    Map<String, Integer> killsPorJugador;
}
