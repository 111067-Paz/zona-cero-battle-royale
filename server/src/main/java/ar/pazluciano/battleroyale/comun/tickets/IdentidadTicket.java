package ar.pazluciano.battleroyale.comun.tickets;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import lombok.Value;

/**
 * Lo que un ticket canjeado revela (F6): quien es, a que partida especifica se une (R1) y con que
 * personaje (PLAN §15) — asi el motor sabe que aspecto anunciar en el snapshot sin que el dominio
 * sepa que existe.
 */
@Value
public class IdentidadTicket {

    Long idUsuario;
    String idPartida;
    Personaje personaje;
}
