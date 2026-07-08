package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Cuenta regresiva antes de arrancar (3-2-1 en el cliente). INPUT sigue ignorado. Al llegar a cero,
 * dispara {@code Partida.iniciarEnCurso()} (marca tickInicio real, crea la zona, puebla el mapa de
 * botin) y transiciona a {@link EnCurso}.
 */
public class CuentaRegresiva implements EstadoDePartida {

    private int ticksRestantes = -1;

    @Override
    public EstadoDePartida procesarTick(Partida partida) {
        if (ticksRestantes < 0) {
            ticksRestantes = partida.getCiclo().getCuentaRegresivaTicks();
        }
        ticksRestantes--;
        if (ticksRestantes <= 0) {
            partida.iniciarEnCurso();
            return new EnCurso();
        }
        return this;
    }

    /** Ticks que faltan para EN_CURSO; el snapshot lo expone como {@code ticksParaInicio} (R27). */
    public int getTicksRestantes() {
        return Math.max(0, ticksRestantes);
    }

    @Override
    public EstadoPartida tipo() {
        return EstadoPartida.CUENTA_REGRESIVA;
    }
}
