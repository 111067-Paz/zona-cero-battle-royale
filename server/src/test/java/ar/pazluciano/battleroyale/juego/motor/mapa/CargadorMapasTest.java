package ar.pazluciano.battleroyale.juego.motor.mapa;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.protocolo.MapaDto;
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
    @DisplayName("carga el mapa valido campo-02 con sus obstaculos y spawns")
    void cargar_campoDos_quedaDisponible() {
        cargador.cargar("campo-02");

        MapaJuego mapa = cargador.mapaJuego("campo-02");
        assertEquals(12, mapa.getObstaculos().size());
        assertEquals(10, mapa.getSpawns().size());
        assertTrue(cargador.buscarMapaDto("campo-02").isPresent());
    }

    @Test
    @DisplayName("el catalogo de mapas disponibles incluye campo-01 y campo-02")
    void idsDisponibles_devuelveElCatalogoCompleto() {
        assertEquals(java.util.List.of("campo-01", "campo-02"), cargador.idsDisponibles());
    }

    @Test
    @DisplayName("un obstaculo sin tipo en el JSON se normaliza a CAJA por defecto")
    void cargar_obstaculoSinTipo_normalizaACaja() {
        cargador.cargar("mapa-sin-tipo");

        MapaDto dto = cargador.buscarMapaDto("mapa-sin-tipo").orElseThrow();
        assertEquals("CAJA", dto.getObstaculos().get(0).getTipo());
    }

    @Test
    @DisplayName("un tipo de obstaculo invalido hace fallar la carga (fail-fast)")
    void cargar_tipoDeObstaculoInvalido_lanzaExcepcion() {
        assertThrows(IllegalStateException.class, () -> cargador.cargar("mapa-tipo-invalido"));
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
