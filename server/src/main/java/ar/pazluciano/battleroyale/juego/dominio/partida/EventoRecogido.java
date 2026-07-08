package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.botin.TipoBotin;
import lombok.Value;

/** Un jugador recogio un botin del suelo (PLAN §7-E), para el feedback sonoro/visual del cliente. */
@Value
public final class EventoRecogido implements EventoDominio {

    String idJugador;
    long idBotin;
    TipoBotin tipo;
}
