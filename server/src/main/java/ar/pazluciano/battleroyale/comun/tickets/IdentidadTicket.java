package ar.pazluciano.battleroyale.comun.tickets;

import lombok.Value;

/** Lo que un ticket canjeado revela (F6): quien es y a que partida especifica se une (R1). */
@Value
public class IdentidadTicket {

    Long idUsuario;
    String idPartida;
}
