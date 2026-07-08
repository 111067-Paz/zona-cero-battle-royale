package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("PercepcionBot - radio + linea de vista")
class PercepcionBotTest {

    private static final double RADIO = 20.0;

    private final PercepcionBot percepcion = new PercepcionBot();

    private Jugador bot() {
        return new Jugador("bot", 0, new Vector2(0.0, 0.0), 100);
    }

    private Jugador rivalEn(double x, double y) {
        return new Jugador("r", 1, new Vector2(x, y), 100);
    }

    @Test
    @DisplayName("rival en rango y con linea de vista: lo percibe")
    void rivalMasCercanoVisible_enRangoConLinea_loEncuentra() {
        MundoFalso mundo = new MundoFalso(List.of(rivalEn(5.0, 0.0)), true);

        assertTrue(percepcion.rivalMasCercanoVisible(bot(), mundo, RADIO).isPresent());
    }

    @Test
    @DisplayName("rival en rango pero SIN linea de vista (pared en medio): NO lo percibe")
    void rivalMasCercanoVisible_sinLineaDeVista_noLoVe() {
        MundoFalso mundo = new MundoFalso(List.of(rivalEn(5.0, 0.0)), false);

        assertTrue(percepcion.rivalMasCercanoVisible(bot(), mundo, RADIO).isEmpty());
    }

    @Test
    @DisplayName("rival fuera del radio: NO lo percibe")
    void rivalMasCercanoVisible_fueraDeRadio_noLoVe() {
        MundoFalso mundo = new MundoFalso(List.of(rivalEn(50.0, 0.0)), true);

        assertTrue(percepcion.rivalMasCercanoVisible(bot(), mundo, RADIO).isEmpty());
    }

    @Test
    @DisplayName("con varios rivales visibles, elige el mas cercano")
    void rivalMasCercanoVisible_variosRivales_eligeElMasCercano() {
        MundoFalso mundo = new MundoFalso(List.of(rivalEn(15.0, 0.0), rivalEn(4.0, 0.0)), true);

        Jugador elegido = percepcion.rivalMasCercanoVisible(bot(), mundo, RADIO).orElseThrow();
        assertEquals(4.0, elegido.getPosicion().getX(), 1e-9);
    }
}
