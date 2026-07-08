package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Solo lectura: la partida ya termino, se sigue emitiendo snapshot (para que el cliente vea el podio)
 * durante {@code graciaFinTicks}. El {@code GestorPartidas} consulta {@code Partida.graciaCumplida()}
 * para saber cuando desregistrar el loop (§7-F).
 */
public class Finalizada implements EstadoDePartida {

    private int ticksTranscurridos = 0;

    @Override
    public EstadoDePartida procesarTick(Partida partida) {
        ticksTranscurridos++;
        return this;
    }

    public int getTicksTranscurridos() {
        return ticksTranscurridos;
    }

    @Override
    public EstadoPartida tipo() {
        return EstadoPartida.FINALIZADA;
    }
}
