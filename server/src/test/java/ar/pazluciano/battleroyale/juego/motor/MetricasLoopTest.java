package ar.pazluciano.battleroyale.juego.motor;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("unit")
@DisplayName("MetricasLoop")
class MetricasLoopTest {

    @Test
    @DisplayName("registrarTick conserva duracion y maximo observados")
    void registrarTick_dosDuraciones_conservaLaUltimaYElMaximo() {
        MetricasLoop metricas = new MetricasLoop();

        metricas.registrarTick(2_000L);
        metricas.registrarTick(5_000L);

        assertEquals(5_000L, metricas.getUltimoTickNanos());
        assertEquals(5_000L, metricas.getMaximoTickNanos());
        assertEquals(2L, metricas.getTicksMedidos());
    }

    @Test
    @DisplayName("registrarSnapshot conserva el ultimo tamanio serializado")
    void registrarSnapshot_tamanioEnBytes_actualizaLaMetrica() {
        MetricasLoop metricas = new MetricasLoop();

        metricas.registrarSnapshot(1_024);
        metricas.registrarSnapshot(2_048);

        assertEquals(2_048, metricas.getUltimoSnapshotBytes());
    }
}
