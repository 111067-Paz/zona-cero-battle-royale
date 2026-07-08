package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Sala de espera: INPUT se ignora (la capa de red igual lo cuenta como heartbeat, R24), nadie se
 * mueve. En modo local (sin matchmaking hasta F6) transiciona por TIMEOUT fijo, no por cantidad de
 * jugadores: los bots ya estan puestos por el {@code GestorPartidas}, asi que no tiene sentido esperar
 * a nadie mas.
 */
public class EnLobby implements EstadoDePartida {

    private int ticksTranscurridos = 0;

    @Override
    public EstadoDePartida procesarTick(Partida partida) {
        ticksTranscurridos++;
        if (ticksTranscurridos >= partida.getCiclo().getLobbyTimeoutTicks()) {
            return new CuentaRegresiva();
        }
        return this;
    }

    @Override
    public EstadoPartida tipo() {
        return EstadoPartida.EN_LOBBY;
    }
}
