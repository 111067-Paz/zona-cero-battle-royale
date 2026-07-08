package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Partida - ciclo de vida (State, Fase 4)")
class EstadoDePartidaTest {

    private static final int LOBBY_TICKS = 3;
    private static final int CUENTA_REGRESIVA_TICKS = 3;
    private static final int GRACIA_TICKS = 3;

    private MapaJuego mapa() {
        return new MapaJuego("t", 100.0, 100.0, List.of(),
                List.of(new Vector2(10.0, 50.0), new Vector2(90.0, 50.0)), List.of());
    }

    private ParametrosSimulacion params() {
        return ParametrosSimulacion.builder()
                .dt(1.0 / 30.0).radioJugador(0.5).velocidadJugador(5.0).vidaInicial(100).build();
    }

    private ParametrosCiclo ciclo() {
        return ParametrosCiclo.builder()
                .lobbyTimeoutTicks(LOBBY_TICKS).cuentaRegresivaTicks(CUENTA_REGRESIVA_TICKS)
                .graciaFinTicks(GRACIA_TICKS).build();
    }

    /** Zona sin efecto: estos tests son del ciclo de estados, no de zona. */
    private ParametrosZona zonaNeutra() {
        return ParametrosZona.builder()
                .radioInicial(10_000.0).radioMinimo(10_000.0).cantidadFases(0)
                .ticksContraccion(1).ticksEspera(999_999).danioPorSegundo(0.0)
                .build();
    }

    private Partida partida() {
        return new Partida("p", mapa(), params(), ciclo(), zonaNeutra(), 1L);
    }

    @Test
    @DisplayName("arranca en EN_LOBBY")
    void constructor_arrancaEnLobby() {
        Partida partida = partida();

        assertEquals(EstadoPartida.EN_LOBBY, partida.getEstado());
        assertTrue(partida.estadoActual() instanceof EnLobby);
    }

    @Test
    @DisplayName("tras el timeout de lobby, pasa a CUENTA_REGRESIVA")
    void avanzarTick_lobbyTimeout_pasaACuentaRegresiva() {
        Partida partida = partida();

        for (int i = 0; i < LOBBY_TICKS; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoPartida.CUENTA_REGRESIVA, partida.getEstado());
        assertTrue(partida.ticksParaInicio().isPresent());
    }

    @Test
    @DisplayName("tras la cuenta regresiva, pasa a EN_CURSO con tickInicio marcado y zona creada")
    void avanzarTick_cuentaRegresivaCumplida_pasaAEnCursoConZonaYTickInicio() {
        Partida partida = partida();

        for (int i = 0; i < LOBBY_TICKS + CUENTA_REGRESIVA_TICKS; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoPartida.EN_CURSO, partida.getEstado());
        // tickInicio se captura ANTES del tick++ final de la llamada que hace la transicion (avanzarTick
        // hace estadoActual.procesarTick(this) y recien despues tick++), por eso vale un tick menos que
        // la cantidad total de llamadas ya realizadas en este punto.
        assertEquals(LOBBY_TICKS + CUENTA_REGRESIVA_TICKS - 1, partida.getTickInicio());
        assertTrue(partida.getZona() != null);
        assertTrue(partida.ticksParaInicio().isEmpty());
    }

    @Test
    @DisplayName("un INPUT en EN_LOBBY no mueve a nadie (se ignora, sin excepciones)")
    void aplicarInput_enLobby_noMueveAlJugador() {
        Partida partida = partida();
        Jugador jugador = partida.agregarJugador("h");
        Vector2 inicial = jugador.getPosicion();
        partida.aplicarInput("h", 1L, new Vector2(1.0, 0.0), 0.0, false, List.of());

        partida.avanzarTick();

        assertTrue(jugador.getPosicion().casiIgual(inicial));
    }

    @Test
    @DisplayName("con 1 vivo, transiciona a FINALIZADA y la gracia se cumple tras sus ticks")
    void avanzarTick_unSoloVivo_finalizaYGraciaSeCumpleATiempo() {
        Partida partida = partida();
        Jugador a = partida.agregarJugador("A");
        Jugador b = partida.agregarJugador("B");
        b.recibirDanio(100); // package-private, accesible desde el mismo paquete de test

        for (int i = 0; i < LOBBY_TICKS + CUENTA_REGRESIVA_TICKS + 1; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoPartida.FINALIZADA, partida.getEstado());
        assertFalse(partida.graciaCumplida());

        for (int i = 0; i < GRACIA_TICKS; i++) {
            partida.avanzarTick();
        }

        assertTrue(partida.graciaCumplida());
        assertEquals("A", partida.getResultadoFinal().getIdGanador());
    }
}
