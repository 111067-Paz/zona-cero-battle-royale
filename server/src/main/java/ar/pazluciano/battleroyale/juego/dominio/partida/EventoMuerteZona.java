package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Value;

/** Un jugador murio por dano de la zona (sin asesino): distinto de un {@code EventoKill} (PLAN §5.2). */
@Value
public class EventoMuerteZona implements EventoDominio {

    String idVictima;
}
