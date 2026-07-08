package ar.pazluciano.battleroyale.juego.motor;

import lombok.Builder;
import lombok.Value;

/** La actuacion de un participante, ya calculada, lista para persistir (PLAN §5.4). */
@Value
@Builder
public class ParticipanteResumen {

    /** "u-{idUsuario}" para humanos, "bot-N" para bots — la plataforma solo persiste a los "u-". */
    String idJugador;

    int kills;

    /** 0 o 1: en una partida de eliminacion simple, un participante muere a lo sumo una vez. */
    int muertes;

    /** 1 = gano. Sin elimination-order para el resto: 2/3 = top3 por orden de caida, el resto null. */
    Integer posicionFinal;
}
