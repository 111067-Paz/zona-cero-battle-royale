package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.juego.dominio.partida.Finalizada;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integracion contra el contexto real (PLAN §10-F6, R12): multi-partida de verdad y el sweep de
 * higiene que desregistra partidas con la gracia de FIN_PARTIDA cumplida.
 */
@SpringBootTest
@Tag("integration")
@DisplayName("GestorPartidas - integracion")
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class GestorPartidasIntegrationTest {

    private final GestorPartidas gestorPartidas;

    GestorPartidasIntegrationTest(GestorPartidas gestorPartidas) {
        this.gestorPartidas = gestorPartidas;
    }

    @Test
    @DisplayName("crearPartida dos veces arma partidas aisladas: ids distintos, ambas registradas")
    void crearPartida_dosVeces_devuelvePartidasAisladas() {
        // WHEN
        GameLoop primera = gestorPartidas.crearPartida(List.of());
        GameLoop segunda = gestorPartidas.crearPartida(List.of());

        // THEN
        assertNotEquals(primera.getIdPartida(), segunda.getIdPartida());
        assertTrue(gestorPartidas.buscarLoop(primera.getIdPartida()).isPresent());
        assertTrue(gestorPartidas.buscarLoop(segunda.getIdPartida()).isPresent());

        primera.detener();
        segunda.detener();
    }

    @Test
    @DisplayName("limpiarPartidasFinalizadas desregistra SOLO las partidas con gracia cumplida")
    void limpiarPartidasFinalizadas_conGraciaCumplida_desregistraSoloEsas() {
        // GIVEN
        GameLoop finalizada = gestorPartidas.crearPartida(List.of());
        GameLoop enCurso = gestorPartidas.crearPartida(List.of());
        forzarGraciaCumplida(finalizada);

        // WHEN
        gestorPartidas.limpiarPartidasFinalizadas();

        // THEN
        assertTrue(gestorPartidas.buscarLoop(finalizada.getIdPartida()).isEmpty());
        assertTrue(gestorPartidas.buscarLoop(enCurso.getIdPartida()).isPresent());

        enCurso.detener();
    }

    @Test
    @DisplayName("higiene (R12): crear y terminar 50 partidas deja el mapa de loops en cero residuos")
    void limpiarPartidasFinalizadas_con50Partidas_dejaCeroResiduos() {
        // GIVEN
        List<GameLoop> loops = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            GameLoop loop = gestorPartidas.crearPartida(List.of());
            forzarGraciaCumplida(loop);
            loops.add(loop);
        }

        // WHEN
        gestorPartidas.limpiarPartidasFinalizadas();

        // THEN
        for (GameLoop loop : loops) {
            assertTrue(gestorPartidas.buscarLoop(loop.getIdPartida()).isEmpty());
        }
    }

    /** Salta la simulacion real (que tardaria minutos): fuerza el estado que graciaCumplida() lee. */
    private void forzarGraciaCumplida(GameLoop loop) {
        Object partida = ReflectionTestUtils.getField(loop, "partida");
        Finalizada finalizada = new Finalizada();
        ReflectionTestUtils.setField(finalizada, "ticksTranscurridos", Integer.MAX_VALUE);
        ReflectionTestUtils.setField(partida, "estadoActual", finalizada);
    }
}
