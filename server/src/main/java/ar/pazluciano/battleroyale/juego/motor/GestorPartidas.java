package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaAsaltante;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaExplorador;
import ar.pazluciano.battleroyale.juego.dominio.bots.FabricaFrancotirador;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaParticipante;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosCiclo;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosSimulacion;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosZona;
import ar.pazluciano.battleroyale.juego.dominio.partida.Partida;
import ar.pazluciano.battleroyale.juego.motor.mapa.CargadorMapas;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Dueno del ciclo de vida de las partidas y sus loops (PLAN §3.1/§10-F6). Es un bean singleton por
 * inyeccion (no un Singleton con estado global): construye la simulacion a partir de la config del
 * framework y le entrega parametros PLANOS, manteniendo el dominio libre de Spring.
 *
 * <p>Multi-partida real (F6): cada llamada a {@link #crearPartida} arma una partida NUEVA e
 * independiente — la crea el actor de matchmaking cuando junta cupo o vence el timeout. El sweep
 * de {@link #limpiarPartidasFinalizadas()} es la otra mitad del ciclo de vida (R12): sin el, el
 * mapa de loops solo crece.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GestorPartidas {

    private final ConfiguracionJuego config;
    private final ObjectMapper objectMapper;
    private final CargadorMapas cargadorMapas;
    private final ApplicationEventPublisher publicadorEventos;
    private final Map<String, GameLoop> loops = new ConcurrentHashMap<>();

    @PreDestroy
    void detenerTodas() {
        loops.values().forEach(GameLoop::detener);
        loops.clear();
    }

    public Optional<GameLoop> buscarLoop(String idPartida) {
        return Optional.ofNullable(loops.get(idPartida));
    }

    /**
     * Crea y arranca una partida nueva (PLAN §5.5, Flujo G): el actor de matchmaking la llama al
     * completar un lote. Los humanos NO se agregan aca — se dan de alta recien cuando cada
     * ticket se canjea por WS (R1); esta lista solo dice CUANTOS bots hacen falta para llegar a
     * {@code jugadoresPorPartida}.
     */
    public GameLoop crearPartida(List<Long> idsHumanos) {
        String idPartida = UUID.randomUUID().toString();
        long semilla = ThreadLocalRandom.current().nextLong();
        MapaJuego mapa = cargadorMapas.mapaJuego(mapaAlAzar());
        Partida partida = new Partida(idPartida, mapa, parametrosDesdeConfig(), cicloDesdeConfig(),
                zonaDesdeConfig(), semilla);
        int cantidadBots = Math.max(0, config.getJugadoresPorPartida() - idsHumanos.size());
        EnsambladorSnapshot ensamblador = new EnsambladorSnapshot();
        agregarBots(partida, cantidadBots, ensamblador);
        EmisorPartida emisor = new EmisorPartida(objectMapper);
        GameLoop loop = new GameLoop(partida, config, emisor, ensamblador, publicadorEventos);
        loops.put(idPartida, loop);
        loop.iniciar();
        log.info("Partida {} creada: {} humanos + {} bots", idPartida, idsHumanos.size(), cantidadBots);
        return loop;
    }

    /**
     * Desregistra las partidas cuya gracia de FIN_PARTIDA ya se cumplio (PLAN §7-F/§8.1, R12):
     * apaga su executor y cierra sus sesiones WS. Publico ademas de {@code @Scheduled} para que los
     * tests de higiene lo disparen sin esperar el scheduler real.
     */
    @Scheduled(fixedDelay = 5_000)
    public void limpiarPartidasFinalizadas() {
        loops.entrySet().removeIf(entrada -> {
            GameLoop loop = entrada.getValue();
            if (!loop.graciaCumplida()) {
                return false;
            }
            loop.detener();
            log.info("Partida {} desregistrada (gracia cumplida)", entrada.getKey());
            return true;
        });
    }

    /**
     * Llena la partida con {@code cantidadBots}, ROTANDO por los arquetipos (Abstract Factory):
     * asaltante, francotirador, explorador. La rotacion es deterministica; la variedad de armas
     * sale de que cada arquetipo trae la suya, coherente con su IA. El personaje visual rota por
     * su propia cuenta ({@code Personaje.values()}) — no tiene relacion con el arquetipo de IA.
     * Se registra ANTES de {@code loop.iniciar()}: el hilo del loop lo ve por happens-before del
     * scheduler, sin necesitar sincronizacion.
     */
    private void agregarBots(Partida partida, int cantidadBots, EnsambladorSnapshot ensamblador) {
        List<FabricaParticipante> arquetipos = List.of(
                new FabricaAsaltante(), new FabricaFrancotirador(), new FabricaExplorador());
        List<Personaje> personajesPirata = List.of(
                Personaje.BARBARROJA,
                Personaje.PIRATA_ANNE,
                Personaje.PIRATA_HENRY,
                Personaje.ESQUELETO,
                Personaje.TIBURON,
                Personaje.MAKO,
                Personaje.SHARK
        );
        for (int i = 0; i < cantidadBots; i++) {
            String idBot = "bot-" + i;
            partida.agregarParticipante(idBot, arquetipos.get(i % arquetipos.size()));
            ensamblador.registrarPersonaje(idBot, personajesPirata.get(i % personajesPirata.size()));
        }
    }

    /** Sorteo simple entre los mapas cargados (Decision de arquitectura #5): un mapa distinto por partida. */
    private String mapaAlAzar() {
        List<String> ids = cargadorMapas.idsDisponibles();
        return ids.get(ThreadLocalRandom.current().nextInt(ids.size()));
    }

    private ParametrosSimulacion parametrosDesdeConfig() {
        return ParametrosSimulacion.builder()
                .dt(config.dt())
                .radioJugador(config.getRadioJugador())
                .velocidadJugador(config.getVelocidadJugador())
                .vidaInicial(config.getVida())
                .build();
    }

    private ParametrosCiclo cicloDesdeConfig() {
        return ParametrosCiclo.builder()
                .lobbyTimeoutTicks(config.lobbyTimeoutTicks())
                .cuentaRegresivaTicks(config.cuentaRegresivaTicks())
                .graciaFinTicks(config.graciaFinTicks())
                .build();
    }

    private ParametrosZona zonaDesdeConfig() {
        return ParametrosZona.builder()
                .radioInicial(config.getZonaRadioInicial())
                .radioMinimo(config.getZonaRadioMinimo())
                .cantidadFases(config.getZonaCantidadFases())
                .ticksContraccion(config.zonaContraccionTicks())
                .ticksEspera(config.zonaEsperaTicks())
                .danioPorSegundo(config.getZonaDanioPorSegundo())
                .build();
    }
}
