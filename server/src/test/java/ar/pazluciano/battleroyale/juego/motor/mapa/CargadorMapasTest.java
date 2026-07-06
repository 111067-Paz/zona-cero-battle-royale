package ar.pazluciano.battleroyale.juego.motor.mapa;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("CargadorMapas - carga y validacion fail-fast")
class CargadorMapasTest {

    private CargadorMapas cargador;

    @BeforeEach
    void crearCargador() {
        ConfiguracionJuego config = new ConfiguracionJuego();
        config.setRadioJugador(0.5);
        cargador = new CargadorMapas(new ObjectMapper(), config);
    }

    @Test
    @DisplayName("carga el mapa valido campo-01 con sus obstaculos y spawns")
    void cargar_mapaValido_quedaDisponible() {
        cargador.cargar("campo-01");

        MapaJuego mapa = cargador.mapaJuego("campo-01");
        assertEquals(9, mapa.getObstaculos().size());
        assertEquals(10, mapa.getSpawns().size());
        assertTrue(cargador.buscarMapaDto("campo-01").isPresent());
    }

    @Test
    @DisplayName("un spawn dentro de un obstaculo hace fallar la carga (fail-fast)")
    void cargar_spawnEnObstaculo_lanzaExcepcion() {
        assertThrows(IllegalStateException.class, () -> cargador.cargar("mapa-spawn-en-obstaculo"));
    }

    @Test
    @DisplayName("un obstaculo mas fino que 1u hace fallar la carga (condicion del move-then-resolve)")
    void cargar_obstaculoDemasiadoFino_lanzaExcepcion() {
        assertThrows(IllegalStateException.class, () -> cargador.cargar("mapa-obstaculo-fino"));
    }
}
