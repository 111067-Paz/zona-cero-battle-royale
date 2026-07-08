package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaExplorador;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Partida - integracion con bots (Fase 3)")
class PartidaBotsTest {

    private static final double DT = 1.0 / 30.0;
    private static final double RADIO = 0.5;
    private static final double VELOCIDAD = 5.0;
    private static final int VIDA = 100;

    private ParametrosSimulacion params() {
        return ParametrosSimulacion.builder()
                .dt(DT).radioJugador(RADIO).velocidadJugador(VELOCIDAD).vidaInicial(VIDA).build();
    }

    private ParametrosCiclo ciclo() {
        return ParametrosCiclo.builder().lobbyTimeoutTicks(1).cuentaRegresivaTicks(1).graciaFinTicks(1).build();
    }

    /** Zona sin efecto: estos tests son de mecanica de bots, no de zona. */
    private ParametrosZona zonaNeutra() {
        return ParametrosZona.builder()
                .radioInicial(10_000.0).radioMinimo(10_000.0).cantidadFases(0)
                .ticksContraccion(1).ticksEspera(999_999).danioPorSegundo(0.0)
                .build();
    }

    @Test
    @DisplayName("dos bots cercanos se detectan, pelean y al menos uno muere (sin excepciones)")
    void avanzarTick_dosBotsCercanos_peleanYAlgunoMuere() {
        MapaJuego mapa = new MapaJuego("t", 100.0, 100.0, List.of(),
                List.of(new Vector2(10.0, 50.0), new Vector2(16.0, 50.0)), List.of());
        Partida partida = new Partida("p", mapa, params(), ciclo(), zonaNeutra(), 1L);
        partida.forzarInicioInmediato();
        partida.agregarParticipante("bot-0", new FabricaExplorador());
        partida.agregarParticipante("bot-1", new FabricaExplorador());

        for (int i = 0; i < 400; i++) {
            partida.avanzarTick();
        }

        long muertos = partida.jugadoresVisibles().stream()
                .filter(jugador -> jugador.getEstadoVida() == EstadoVida.MUERTO)
                .count();
        assertTrue(muertos >= 1, "esperaba que al menos un bot muriera en la pelea");
    }

    @Test
    @DisplayName("el humano (Null Object) NO se mueve solo si no llega input de la red")
    void avanzarTick_humanoSinInput_noSeMueve() {
        MapaJuego mapa = new MapaJuego("t", 100.0, 100.0, List.of(), List.of(new Vector2(10.0, 50.0)), List.of());
        Partida partida = new Partida("p", mapa, params(), ciclo(), zonaNeutra(), 1L);
        Jugador humano = partida.agregarJugador("h");
        Vector2 inicial = humano.getPosicion();
        partida.forzarInicioInmediato();

        for (int i = 0; i < 60; i++) {
            partida.avanzarTick();
        }

        assertTrue(humano.getPosicion().casiIgual(inicial));
    }
}
