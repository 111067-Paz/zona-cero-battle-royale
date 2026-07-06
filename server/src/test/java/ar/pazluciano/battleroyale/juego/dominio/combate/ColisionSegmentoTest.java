package ar.pazluciano.battleroyale.juego.dominio.combate;

import ar.pazluciano.battleroyale.juego.dominio.mapa.ObstaculoAABB;
import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("ColisionSegmento - anti-tunneling de proyectiles")
class ColisionSegmentoTest {

    private static final double RADIO = 0.5;
    private static final double EPSILON = 1e-6;

    private final ColisionSegmento resolutor = new ColisionSegmento();

    private Jugador jugadorEn(String id, double x, double y) {
        return new Jugador(id, 0, new Vector2(x, y), 100);
    }

    @Test
    @DisplayName("una bala rapida NO atraviesa una pared fina: impacta el segmento, no salta el muro")
    void primerImpacto_paredFina_impactaLaPared() {
        ObstaculoAABB paredFina = new ObstaculoAABB(50.0, 40.0, 1.0, 20.0); // 1u de grosor

        ImpactoSegmento impacto = resolutor.primerImpacto(
                new Vector2(45.0, 50.0), new Vector2(55.0, 50.0), List.of(paredFina), List.of(), RADIO);

        assertTrue(impacto.huboImpacto());
        assertFalse(impacto.impactoJugador());
        assertEquals(0.5, impacto.getT(), EPSILON); // entra en x=50
    }

    @Test
    @DisplayName("el segmento que cruza a un jugador lo impacta")
    void primerImpacto_atraviesaJugador_impactaJugador() {
        Jugador victima = jugadorEn("v", 50.0, 50.0);

        ImpactoSegmento impacto = resolutor.primerImpacto(
                new Vector2(45.0, 50.0), new Vector2(55.0, 50.0), List.of(), List.of(victima), RADIO);

        assertTrue(impacto.impactoJugador());
        assertEquals("v", impacto.getVictima().getId());
    }

    @Test
    @DisplayName("una pared mas cercana que el jugador bloquea el disparo")
    void primerImpacto_paredAntesQueJugador_gananLaPared() {
        ObstaculoAABB pared = new ObstaculoAABB(48.0, 49.0, 1.0, 2.0); // entra en t=0.3
        Jugador detras = jugadorEn("v", 52.0, 50.0);                   // entraria en t=0.65

        ImpactoSegmento impacto = resolutor.primerImpacto(
                new Vector2(45.0, 50.0), new Vector2(55.0, 50.0), List.of(pared), List.of(detras), RADIO);

        assertTrue(impacto.huboImpacto());
        assertFalse(impacto.impactoJugador()); // la pared bloquea
    }

    @Test
    @DisplayName("un segmento que no toca nada no impacta")
    void primerImpacto_sinContacto_noImpacta() {
        Jugador lejano = jugadorEn("v", 50.0, 50.0);

        ImpactoSegmento impacto = resolutor.primerImpacto(
                new Vector2(45.0, 10.0), new Vector2(55.0, 10.0), List.of(), List.of(lejano), RADIO);

        assertFalse(impacto.huboImpacto());
    }
}
