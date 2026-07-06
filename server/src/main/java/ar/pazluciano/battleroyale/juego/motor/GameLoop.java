package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Partida;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.protocolo.Bienvenida;
import ar.pazluciano.battleroyale.juego.protocolo.ConfigBienvenida;
import ar.pazluciano.battleroyale.juego.protocolo.Input;
import ar.pazluciano.battleroyale.juego.protocolo.VectorMensaje;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Hilo dedicado que simula UNA partida (PLAN §2.4/§3.1). Es el UNICO lugar donde se muta el estado
 * de esa partida: los hilos de red solo {@link #encolar} comandos en una cola concurrente.
 *
 * <p>Loop de paso fijo (fixed timestep): la FISICA avanza siempre con {@code dt} constante y
 * deterministico; solo la CADENCIA lee el reloj para decidir cuantos pasos correr, con catch-up
 * acotado a {@link #MAX_CATCHUP} pasos para nunca entrar en espiral de muerte (§8.1). El orden de
 * cada tick es invariable: procesar comandos -> avanzar simulacion -> emitir snapshot (§7-C).
 */
@Slf4j
public class GameLoop {

    /** Maximo de pasos de simulacion recuperables en un pulso: cota anti espiral de muerte (§8.1). */
    private static final int MAX_CATCHUP = 3;

    private static final double NANOS_POR_SEGUNDO = 1_000_000_000.0;

    /** Mapa placeholder de la Fase 0; el mapa real (AABBs, spawns) llega en la Fase 1. */
    private static final String ID_MAPA = "campo-01";

    private final Partida partida;
    private final ConfiguracionJuego config;
    private final EmisorPartida emisor;
    private final EnsambladorSnapshot ensamblador;
    private final Queue<Comando> cola = new ConcurrentLinkedQueue<>();
    private final ScheduledExecutorService executor;

    private long ultimoNanos;
    private double acumulador;

    public GameLoop(Partida partida, ConfiguracionJuego config, EmisorPartida emisor,
                    EnsambladorSnapshot ensamblador) {
        this.partida = partida;
        this.config = config;
        this.emisor = emisor;
        this.ensamblador = ensamblador;
        this.executor = Executors.newSingleThreadScheduledExecutor(tarea -> {
            Thread hilo = new Thread(tarea, "loop-" + partida.getId());
            hilo.setDaemon(true);
            return hilo;
        });
    }

    /** Encola un comando desde cualquier hilo de red. Thread-safe por ser cola concurrente. */
    public void encolar(Comando comando) {
        cola.offer(comando);
    }

    public void iniciar() {
        ultimoNanos = System.nanoTime();
        long periodoMillis = Math.max(1L, 1000L / config.getTickRate());
        executor.scheduleWithFixedDelay(this::pulso, 0L, periodoMillis, TimeUnit.MILLISECONDS);
        log.info("Partida {} iniciada a {} ticks/s", partida.getId(), config.getTickRate());
    }

    public void detener() {
        executor.shutdown();
        emisor.cerrarTodas();
        log.info("Partida {} detenida en el tick {}", partida.getId(), partida.getTick());
    }

    public String getIdPartida() {
        return partida.getId();
    }

    /**
     * Un pulso del scheduler. Acumula el tiempo real transcurrido y ejecuta tantos pasos de {@code dt}
     * como correspondan, hasta {@link #MAX_CATCHUP}. Si el atraso supera esa cota se descarta el
     * backlog (jamas espiral de muerte). Toda excepcion se captura: una partida rota se apaga sola sin
     * arrastrar a las demas ni cancelar en silencio la tarea del scheduler.
     */
    private void pulso() {
        try {
            long ahora = System.nanoTime();
            acumulador += (ahora - ultimoNanos) / NANOS_POR_SEGUNDO;
            ultimoNanos = ahora;

            double dt = config.dt();
            int pasos = 0;
            while (acumulador >= dt && pasos < MAX_CATCHUP) {
                ejecutarUnTick();
                acumulador -= dt;
                pasos++;
            }
            if (acumulador > dt) {
                acumulador = 0.0;
            }
        } catch (Exception e) {
            log.error("Tick fallido en la partida {}: {}", partida.getId(), e.getMessage(), e);
            detener();
        }
    }

    private void ejecutarUnTick() {
        procesarComandos();
        partida.avanzarTick();
        if (partida.getTick() % config.ticksPorSnapshot() == 0) {
            emisor.emitir(ensamblador.desde(partida));
        }
    }

    /**
     * Drena la cola y aplica los comandos en orden determinista: primero los estructurales (unirse,
     * salir, desconexion) en orden de llegada, luego los INPUT ordenados por (orden de union, sec).
     * Aplicar los estructurales antes garantiza que un INPUT del mismo lote encuentre a su jugador ya
     * creado (o ya retirado) sin ambiguedad.
     */
    private void procesarComandos() {
        List<ComandoInput> inputs = new ArrayList<>();
        Comando comando;
        while ((comando = cola.poll()) != null) {
            switch (comando) {
                case ComandoUnirse unirse -> procesarUnirse(unirse);
                case ComandoSalir salir -> retirar(salir.getIdJugador());
                case ComandoDesconexion desconexion -> retirar(desconexion.getIdJugador());
                case ComandoInput input -> inputs.add(input);
            }
        }
        aplicarInputsOrdenados(inputs);
    }

    private void procesarUnirse(ComandoUnirse unirse) {
        ConexionJugador conexion = unirse.getConexion();
        partida.agregarJugador(conexion.idJugador());
        emisor.enviarA(conexion, construirBienvenida(conexion.idJugador()));
        emisor.registrar(conexion);
    }

    private void retirar(String idJugador) {
        partida.quitarJugador(idJugador);
        emisor.quitar(idJugador);
    }

    private void aplicarInputsOrdenados(List<ComandoInput> inputs) {
        inputs.sort(Comparator
                .comparingInt((ComandoInput comando) -> ordenUnionDe(comando.getIdJugador()))
                .thenComparingLong(comando -> comando.getInput().getSec()));
        for (ComandoInput comando : inputs) {
            aplicarInput(comando);
        }
    }

    private void aplicarInput(ComandoInput comando) {
        Input input = comando.getInput();
        Vector2 mover = aVector2(input.getMover());
        partida.aplicarInput(comando.getIdJugador(), input.getSec(), mover, input.getApuntar(), input.isDisparar());
    }

    private int ordenUnionDe(String idJugador) {
        return partida.buscarJugador(idJugador)
                .map(Jugador::getOrdenUnion)
                .orElse(Integer.MAX_VALUE);
    }

    private Vector2 aVector2(VectorMensaje mover) {
        if (mover == null) {
            return Vector2.CERO;
        }
        return new Vector2(mover.getX(), mover.getY());
    }

    private Bienvenida construirBienvenida(String idJugador) {
        ConfigBienvenida configBienvenida = ConfigBienvenida.builder()
                .tickRate(config.getTickRate())
                .snapshotRate(config.getSnapshotRate())
                .mundo(config.getMundo())
                .velocidad(config.getVelocidadJugador())
                .build();
        return Bienvenida.builder()
                .idJugador(idJugador)
                .idPartida(partida.getId())
                .config(configBienvenida)
                .idMapa(ID_MAPA)
                .build();
    }
}
