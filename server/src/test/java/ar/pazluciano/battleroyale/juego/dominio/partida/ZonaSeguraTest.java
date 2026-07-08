package ar.pazluciano.battleroyale.juego.dominio.partida;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("ZonaSegura - contraccion concentrica (Fase 4, §7-E)")
class ZonaSeguraTest {

    private static final double RADIO_INICIAL = 100.0;
    private static final double RADIO_MINIMO = 20.0;
    private static final int FASES = 4;
    private static final int TICKS_CONTRACCION = 10;
    private static final int TICKS_ESPERA = 5;
    private static final double EPSILON = 1e-6;

    private ZonaSegura zona;

    @BeforeEach
    void crearZona() {
        ParametrosZona parametros = ParametrosZona.builder()
                .radioInicial(RADIO_INICIAL).radioMinimo(RADIO_MINIMO).cantidadFases(FASES)
                .ticksContraccion(TICKS_CONTRACCION).ticksEspera(TICKS_ESPERA).danioPorSegundo(5.0)
                .build();
        zona = new ZonaSegura(parametros, new Vector2(128.0, 128.0));
    }

    @Test
    @DisplayName("arranca en el radio inicial, fase 0, sin contraer")
    void constructor_arrancaEnRadioInicial() {
        assertEquals(RADIO_INICIAL, zona.getRadio(), EPSILON);
        assertEquals(0, zona.getFase());
        assertFalse(zona.isContrayendo());
    }

    @Test
    @DisplayName("durante la espera, el radio no cambia")
    void avanzarTick_duranteLaEspera_radioNoCambia() {
        for (int i = 0; i < TICKS_ESPERA - 1; i++) {
            zona.avanzarTick();
        }

        assertEquals(RADIO_INICIAL, zona.getRadio(), EPSILON);
    }

    @Test
    @DisplayName("al cabo de UNA contraccion completa, el radio llega exacto al objetivo de la fase")
    void avanzarTick_contraccionCompleta_llegaAlRadioObjetivoExacto() {
        double reduccionPorFase = (RADIO_INICIAL - RADIO_MINIMO) / FASES;
        double radioEsperado = RADIO_INICIAL - reduccionPorFase;

        avanzar(TICKS_ESPERA + TICKS_CONTRACCION);

        assertEquals(radioEsperado, zona.getRadio(), EPSILON);
        assertEquals(1, zona.getFase());
        assertFalse(zona.isContrayendo());
    }

    @Test
    @DisplayName("tras todas las fases, el radio queda en el minimo y no sigue contrayendo")
    void avanzarTick_todasLasFases_quedaEnRadioMinimo() {
        int ticksTotales = FASES * (TICKS_ESPERA + TICKS_CONTRACCION) + TICKS_ESPERA;

        avanzar(ticksTotales);

        assertEquals(RADIO_MINIMO, zona.getRadio(), EPSILON);
        assertEquals(FASES, zona.getFase());
    }

    @Test
    @DisplayName("contiene() es verdadero dentro del radio y falso fuera")
    void contiene_puntoDentroYFuera() {
        assertTrue(zona.contiene(new Vector2(128.0, 128.0))); // centro
        assertTrue(zona.contiene(new Vector2(128.0 + RADIO_INICIAL - 1, 128.0)));
        assertFalse(zona.contiene(new Vector2(128.0 + RADIO_INICIAL + 1, 128.0)));
    }

    @Test
    @DisplayName("el dano de zona fraccional es EXACTO cuando el acumulado cruza enteros (§7-E)")
    void aplicarDanioZonaFraccional_acumuladorCruzaEnteros_aplicaExacto() {
        // 0.5 y 1.0 son exactamente representables en binario: cero ambiguedad de redondeo.
        Jugador jugador = new Jugador("j", 0, Vector2.CERO, 100);

        jugador.aplicarDanioZonaFraccional(1.0, 0.5); // acumula 0.5: no cruza 1.0 todavia
        assertEquals(100, jugador.getHp());

        jugador.aplicarDanioZonaFraccional(1.0, 0.5); // acumula 1.0 exacto: aplica 1 de dano
        assertEquals(99, jugador.getHp());

        for (int i = 0; i < 20; i++) { // 10 cruces mas de a 0.5+0.5 -> 10 de dano
            jugador.aplicarDanioZonaFraccional(1.0, 0.5);
        }
        assertEquals(89, jugador.getHp());
    }

    private void avanzar(int ticks) {
        for (int i = 0; i < ticks; i++) {
            zona.avanzarTick();
        }
    }
}
