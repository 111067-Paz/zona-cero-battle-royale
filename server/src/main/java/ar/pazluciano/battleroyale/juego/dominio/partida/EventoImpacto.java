package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Getter;

/**
 * Evento de dominio emitido cuando un proyectil impacta a un jugador (PLAN §17.4, R29).
 * Registra las coordenadas y el daño exacto para que el cliente lo renderice de inmediato.
 *
 * <p>Se define como clase estándar con Lombok, ya que los records están prohibidos en el runbook.</p>
 */
@Getter
public final class EventoImpacto implements EventoDominio {

    private final String idVictima;
    private final int dano;
    private final double x;
    private final double y;

    public EventoImpacto(String idVictima, int dano, double x, double y) {
        this.idVictima = idVictima;
        this.dano = dano;
        this.x = x;
        this.y = y;
    }
}
