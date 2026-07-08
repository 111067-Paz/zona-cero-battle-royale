package ar.pazluciano.battleroyale.juego.motor;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO plano armado por el MOTOR al finalizar una partida (PLAN §5.4). El dominio no sabe que esto
 * existe (jamas toca reloj de pared, §2.7); el motor SI puede, porque no es el dominio puro.
 */
@Value
@Builder
public class ResumenPartida {

    String partidaId;
    LocalDateTime fechaInicio;
    LocalDateTime fechaFin;
    List<ParticipanteResumen> participantes;
}
