package ar.pazluciano.battleroyale.juego.motor;

import lombok.Getter;

/**
 * Evento de Spring que el MOTOR publica al finalizar una partida (PLAN §5.4). POJO plano: desde
 * Spring 4.2 un {@code ApplicationEventPublisher} puede publicar cualquier objeto, sin necesidad
 * de extender {@code ApplicationEvent}. Lo consume {@code ResultadoPartidaListener} en
 * {@code plataforma} — el dominio jamas sabe que este evento existe.
 */
@Getter
public class FinDePartidaEvent {

    private final ResumenPartida resumen;

    public FinDePartidaEvent(ResumenPartida resumen) {
        this.resumen = resumen;
    }
}
