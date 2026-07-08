package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaAsaltante;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaExplorador;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaFrancotirador;
import ar.pazluciano.battleroyale.juego.dominio.botin.Botin;
import ar.pazluciano.battleroyale.juego.dominio.botin.TipoBotin;
import ar.pazluciano.battleroyale.juego.dominio.combate.TipoArma;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Partida - Fase 4: recoger, desempates, fin de partida")
class PartidaFase4Test {

    private MapaJuego mapaSinBotinAutomatico() {
        return new MapaJuego("t", 256.0, 256.0, List.of(),
                List.of(new Vector2(10.0, 10.0), new Vector2(20.0, 20.0)), List.of());
    }

    private ParametrosSimulacion params() {
        return ParametrosSimulacion.builder()
                .dt(1.0 / 30.0).radioJugador(0.5).velocidadJugador(5.0).vidaInicial(100).build();
    }

    private ParametrosCiclo ciclo() {
        return ParametrosCiclo.builder().lobbyTimeoutTicks(1).cuentaRegresivaTicks(1).graciaFinTicks(1).build();
    }

    /** Zona sin efecto: radio gigante, sin fases. Para los tests que NO son de zona. */
    private ParametrosZona zonaNeutra() {
        return ParametrosZona.builder()
                .radioInicial(10_000.0).radioMinimo(10_000.0).cantidadFases(0)
                .ticksContraccion(1).ticksEspera(999_999).danioPorSegundo(0.0)
                .build();
    }

    private Partida partidaEnCurso() {
        Partida partida = new Partida("p", mapaSinBotinAutomatico(), params(), ciclo(), zonaNeutra(), 1L);
        partida.forzarInicioInmediato();
        return partida;
    }

    // ---------- RECOGER ----------

    @Test
    @DisplayName("RECOGER un botiquin en rango lo suma al inventario y lo marca recogido")
    void recoger_botiquinEnRango_sumaYMarcaRecogido() {
        Partida partida = partidaEnCurso();
        Jugador jugador = partida.agregarJugador("j");
        Botin botiquin = new Botin(1L, jugador.getPosicion(), TipoBotin.BOTIQUIN);
        partida.agregarBotinDeTest(botiquin);

        partida.aplicarInput("j", 1L, Vector2.CERO, 0.0, false, List.of(AccionJugador.RECOGER));
        partida.avanzarTick();

        assertEquals(1, jugador.getBotiquines());
        assertFalse(botiquin.isDisponible());
    }

    @Test
    @DisplayName("RECOGER un arma la equipa, reemplazando la anterior (R28)")
    void recoger_arma_reemplazaLaAnterior() {
        Partida partida = partidaEnCurso();
        Jugador jugador = partida.agregarJugador("j"); // nace con Pistola (R17)
        Botin rifle = new Botin(1L, jugador.getPosicion(), TipoBotin.RIFLE);
        partida.agregarBotinDeTest(rifle);

        partida.aplicarInput("j", 1L, Vector2.CERO, 0.0, false, List.of(AccionJugador.RECOGER));
        partida.avanzarTick();

        assertEquals(TipoArma.RIFLE, jugador.getArma().tipo());
    }

    @Test
    @DisplayName("RECOGER con botiquines al maximo es no-op: el botin sigue disponible (R37)")
    void recoger_botiquinLleno_esNoOpYElBotinQuedaDisponible() {
        Partida partida = partidaEnCurso();
        Jugador jugador = partida.agregarJugador("j");
        jugador.sumarBotiquin();
        jugador.sumarBotiquin();
        jugador.sumarBotiquin(); // ya tiene 3 (maximo)
        Botin botiquin = new Botin(1L, jugador.getPosicion(), TipoBotin.BOTIQUIN);
        partida.agregarBotinDeTest(botiquin);

        partida.aplicarInput("j", 1L, Vector2.CERO, 0.0, false, List.of(AccionJugador.RECOGER));
        partida.avanzarTick();

        assertEquals(3, jugador.getBotiquines());
        assertTrue(botiquin.isDisponible());
    }

    @Test
    @DisplayName("RECOGER fuera de rango no hace nada")
    void recoger_fueraDeRango_noHaceNada() {
        Partida partida = partidaEnCurso();
        Jugador jugador = partida.agregarJugador("j");
        Botin lejano = new Botin(1L, new Vector2(jugador.getPosicion().getX() + 50.0, jugador.getPosicion().getY()),
                TipoBotin.BOTIQUIN);
        partida.agregarBotinDeTest(lejano);

        partida.aplicarInput("j", 1L, Vector2.CERO, 0.0, false, List.of(AccionJugador.RECOGER));
        partida.avanzarTick();

        assertEquals(0, jugador.getBotiquines());
        assertTrue(lejano.isDisponible());
    }

    @Test
    @DisplayName("RECOGER con dos botines equidistantes: gana el de menor id (R15)")
    void recoger_empateDeDistancia_ganaElDeMenorId() {
        Partida partida = partidaEnCurso();
        Jugador jugador = partida.agregarJugador("j");
        Vector2 pos = jugador.getPosicion();
        Botin idMayor = new Botin(9L, new Vector2(pos.getX() + 1.0, pos.getY()), TipoBotin.BOTIQUIN);
        Botin idMenor = new Botin(2L, new Vector2(pos.getX() - 1.0, pos.getY()), TipoBotin.BOTIQUIN);
        partida.agregarBotinDeTest(idMayor);
        partida.agregarBotinDeTest(idMenor);

        partida.aplicarInput("j", 1L, Vector2.CERO, 0.0, false, List.of(AccionJugador.RECOGER));
        partida.avanzarTick();

        assertFalse(idMenor.isDisponible());
        assertTrue(idMayor.isDisponible());
    }

    // ---------- Desempates (§8.3) ----------

    /** Zona letal instantanea: radio 0 (todos quedan "afuera") y dano gigante con dt=1 (mata en un tick). */
    private Partida partidaParaDesempate() {
        ParametrosSimulacion paramsLetal = ParametrosSimulacion.builder()
                .dt(1.0).radioJugador(0.5).velocidadJugador(5.0).vidaInicial(100).build();
        ParametrosZona zonaLetal = ParametrosZona.builder()
                .radioInicial(0.0).radioMinimo(0.0).cantidadFases(0)
                .ticksContraccion(1).ticksEspera(999_999).danioPorSegundo(1000.0)
                .build();
        Partida partida = new Partida("p", mapaSinBotinAutomatico(), paramsLetal, ciclo(), zonaLetal, 1L);
        partida.forzarInicioInmediato();
        return partida;
    }

    @Test
    @DisplayName("desempate: con igual kills y orden, gana quien tenia MAS HP al inicio del tick")
    void evaluarVictoria_empatePorMuerteSimultanea_ganaMayorHpAlInicioDelTick() {
        Partida partida = partidaParaDesempate();
        Jugador a = partida.agregarJugador("A");
        Jugador b = partida.agregarJugador("B");
        a.recibirDanio(50); // A queda con 50 hp
        b.recibirDanio(70); // B queda con 30 hp

        partida.ejecutarTickJugable(); // la zona letal mata a ambos en este mismo tick
        Optional<ResultadoFinal> resultado = partida.evaluarVictoria();

        assertTrue(resultado.isPresent());
        assertEquals("A", resultado.get().getIdGanador());
    }

    @Test
    @DisplayName("desempate: con igual HP, gana quien tenia MAS kills")
    void evaluarVictoria_empatePorMuerteSimultanea_ganaMasKills() {
        Partida partida = partidaParaDesempate();
        Jugador a = partida.agregarJugador("A");
        Jugador b = partida.agregarJugador("B");
        a.sumarKill();
        a.sumarKill();
        b.sumarKill();

        partida.ejecutarTickJugable();
        Optional<ResultadoFinal> resultado = partida.evaluarVictoria();

        assertEquals("A", resultado.orElseThrow().getIdGanador());
    }

    @Test
    @DisplayName("desempate: con igual HP y kills, gana el de MENOR orden de union")
    void evaluarVictoria_empatePorMuerteSimultanea_ganaMenorOrdenDeUnion() {
        Partida partida = partidaParaDesempate();
        partida.agregarJugador("A"); // ordenUnion 0
        partida.agregarJugador("B"); // ordenUnion 1

        partida.ejecutarTickJugable();
        Optional<ResultadoFinal> resultado = partida.evaluarVictoria();

        assertEquals("A", resultado.orElseThrow().getIdGanador());
    }

    // ---------- Fin de partida ----------

    @Test
    @DisplayName("FIN_PARTIDA se publica UNA sola vez, aunque se sigan corriendo ticks despues")
    void avanzarTick_partidaTerminada_finPartidaSePublicaUnaVez() {
        Partida partida = partidaParaDesempate();
        partida.agregarJugador("A");
        partida.agregarJugador("B");

        long publicaciones = 0;
        for (int i = 0; i < 5; i++) {
            partida.avanzarTick(); // la zona letal termina la partida en el primer tick EN_CURSO
            publicaciones += partida.drenarEventos().stream()
                    .filter(EventoFinPartida.class::isInstance)
                    .count();
        }

        assertEquals(1, publicaciones);
    }

    @Test
    @DisplayName("el resultado final queda fijo una vez calculado, no se recalcula en ticks siguientes")
    void avanzarTick_partidaTerminada_resultadoQuedaFijo() {
        Partida partida = partidaParaDesempate();
        partida.agregarJugador("A");
        partida.agregarJugador("B");

        for (int i = 0; i < 3; i++) {
            partida.avanzarTick();
        }
        ResultadoFinal primero = partida.getResultadoFinal();

        for (int i = 0; i < 3; i++) {
            partida.avanzarTick();
        }

        assertEquals(primero, partida.getResultadoFinal());
        assertEquals(EstadoPartida.FINALIZADA, partida.getEstado());
    }

    // ---------- Integracion ----------

    @Test
    @DisplayName("partida completa contra bots corre miles de ticks sin excepciones y termina con un ganador")
    void avanzarTick_partidaCompleta_terminaConUnGanadorSinExcepciones() {
        MapaJuego mapa = new MapaJuego("t", 100.0, 100.0, List.of(),
                List.of(new Vector2(10.0, 10.0), new Vector2(90.0, 90.0), new Vector2(10.0, 90.0)), List.of());
        ParametrosCiclo cicloRapido = ParametrosCiclo.builder()
                .lobbyTimeoutTicks(2).cuentaRegresivaTicks(2).graciaFinTicks(2).build();
        Partida partida = new Partida("p", mapa, params(), cicloRapido, zonaNeutra(), 7L);
        partida.agregarParticipante("bot-0", new FabricaExplorador());
        partida.agregarParticipante("bot-1", new FabricaAsaltante());
        partida.agregarParticipante("bot-2", new FabricaFrancotirador());

        for (int i = 0; i < 6000; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoPartida.FINALIZADA, partida.getEstado());
        assertTrue(partida.getResultadoFinal() != null);
    }
}
