package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaAsaltante;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaExplorador;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaFrancotirador;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaParticipante;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosSimulacion;
import ar.pazluciano.battleroyale.juego.dominio.partida.Partida;
import ar.pazluciano.battleroyale.juego.motor.mapa.CargadorMapas;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dueno del ciclo de vida de las partidas y sus loops (PLAN §3.1). Es un bean singleton por
 * inyeccion (no un Singleton con estado global): construye la simulacion a partir de la config del
 * framework y le entrega parametros PLANOS, manteniendo el dominio libre de Spring.
 *
 * <p>Fase 0: crea UNA partida local contra la que se juega en {@code localhost}. La multi-partida y
 * el matchmaking llegan en la Fase 6 sin tocar el dominio.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GestorPartidas {

    /** Semilla fija en dev: hace la partida reproducible (mismo spawn, mismo comportamiento). */
    private static final long SEMILLA_DEV = 42L;

    /** Mapa de la partida local en dev. */
    private static final String ID_MAPA_LOCAL = "campo-01";

    private final ConfiguracionJuego config;
    private final ObjectMapper objectMapper;
    private final CargadorMapas cargadorMapas;
    private final Map<String, GameLoop> loops = new ConcurrentHashMap<>();

    private GameLoop loopLocal;

    @PostConstruct
    void iniciarPartidaLocal() {
        loopLocal = crearPartida(SEMILLA_DEV);
        loopLocal.iniciar();
        log.info("Partida local creada: {}", loopLocal.getIdPartida());
    }

    @PreDestroy
    void detenerTodas() {
        loops.values().forEach(GameLoop::detener);
        loops.clear();
    }

    /** Loop de la unica partida local (Fase 0). La capa de red encola sus comandos aca. */
    public GameLoop partidaLocal() {
        return loopLocal;
    }

    public Optional<GameLoop> buscarLoop(String idPartida) {
        return Optional.ofNullable(loops.get(idPartida));
    }

    private GameLoop crearPartida(long semilla) {
        String idPartida = UUID.randomUUID().toString();
        MapaJuego mapa = cargadorMapas.mapaJuego(ID_MAPA_LOCAL);
        Partida partida = new Partida(idPartida, mapa, parametrosDesdeConfig(), semilla);
        agregarBots(partida);
        EmisorPartida emisor = new EmisorPartida(objectMapper);
        GameLoop loop = new GameLoop(partida, config, emisor, new EnsambladorSnapshot());
        loops.put(idPartida, loop);
        return loop;
    }

    /**
     * Llena la partida con {@code config.botsLocales} bots, ROTANDO por los arquetipos (Abstract
     * Factory): asaltante, francotirador, explorador. La rotacion es deterministica; la variedad de
     * armas sale de que cada arquetipo trae la suya, coherente con su IA.
     */
    private void agregarBots(Partida partida) {
        List<FabricaParticipante> arquetipos = List.of(
                new FabricaAsaltante(), new FabricaFrancotirador(), new FabricaExplorador());
        for (int i = 0; i < config.getBotsLocales(); i++) {
            partida.agregarParticipante("bot-" + i, arquetipos.get(i % arquetipos.size()));
        }
    }

    private ParametrosSimulacion parametrosDesdeConfig() {
        return ParametrosSimulacion.builder()
                .dt(config.dt())
                .radioJugador(config.getRadioJugador())
                .velocidadJugador(config.getVelocidadJugador())
                .vidaInicial(config.getVida())
                .build();
    }
}
