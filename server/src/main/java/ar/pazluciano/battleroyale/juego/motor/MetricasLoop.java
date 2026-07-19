package ar.pazluciano.battleroyale.juego.motor;

/**
 * Metricas de diagnostico del loop, fuera del dominio y sin participacion en la simulacion.
 * El loop escribe estos valores desde su unico hilo; los getters son seguros para lectura externa.
 */
public final class MetricasLoop {

    private volatile long ultimoTickNanos;
    private volatile long maximoTickNanos;
    private volatile long ticksMedidos;
    private volatile int ultimoSnapshotBytes;

    public void registrarTick(long duracionNanos) {
        ultimoTickNanos = duracionNanos;
        maximoTickNanos = Math.max(maximoTickNanos, duracionNanos);
        ticksMedidos++;
    }

    public void registrarSnapshot(int tamanioBytes) {
        ultimoSnapshotBytes = tamanioBytes;
    }

    public long getUltimoTickNanos() {
        return ultimoTickNanos;
    }

    public long getMaximoTickNanos() {
        return maximoTickNanos;
    }

    public long getTicksMedidos() {
        return ticksMedidos;
    }

    public int getUltimoSnapshotBytes() {
        return ultimoSnapshotBytes;
    }
}
