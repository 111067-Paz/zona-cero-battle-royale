package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.comun.config.ConfiguracionMatchmaking;
import jakarta.annotation.PreDestroy;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Actor de un solo hilo dueno de la cola de matchmaking (PLAN §3.1/§5.5, R6). Todas las mutaciones
 * de estado (cola de espera, asignaciones) ocurren EXCLUSIVAMENTE en su propio
 * {@link ScheduledExecutorService} de un hilo — igual que el {@code GameLoop} es el unico dueno del
 * estado de SU partida. Elimina por diseno las carreras "partida llena en el instante del join" y
 * "usuario en dos colas".
 *
 * <p>A diferencia del {@code GameLoop} (fire-and-forget: nadie espera la respuesta de un INPUT), el
 * REST de matchmaking SI necesita el resultado ya — {@link #encolar} y {@link #consultarEstado}
 * despachan al hilo del actor y bloquean brevemente al hilo HTTP con {@code Future.get()}, nunca al
 * reves.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ActorMatchmaking {

    /** Tiempo que una asignacion ya resuelta queda visible para el polling antes de barrerse. */
    private static final long TTL_ASIGNACION_MILLIS = 120_000;

    private final GestorPartidas gestorPartidas;
    private final ConfiguracionJuego configJuego;
    private final ConfiguracionMatchmaking configMatchmaking;

    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(tarea -> {
        Thread hilo = new Thread(tarea, "matchmaking");
        hilo.setDaemon(true);
        return hilo;
    });

    /** SOLO se tocan desde el hilo del actor (arriba). */
    private final LinkedHashSet<Long> colaEspera = new LinkedHashSet<>();
    private final Map<Long, Asignacion> asignaciones = new LinkedHashMap<>();
    private ScheduledFuture<?> timeoutPendiente;

    @PreDestroy
    void apagar() {
        executor.shutdown();
    }

    /** Encola al usuario (409 si ya estaba en cola o con partida asignada sin leer — R6). */
    public void encolar(Long idUsuario) {
        ejecutarEnElActor(() -> {
            encolarInterno(idUsuario);
            return null;
        });
    }

    /** Estado para el polling del cliente (R21): en cola con {@code n} encontrados, o asignado. */
    public EstadoCola consultarEstado(Long idUsuario) {
        return ejecutarEnElActor(() -> consultarEstadoInterno(idUsuario));
    }

    private void encolarInterno(Long idUsuario) {
        limpiarSiVencida(idUsuario);
        if (colaEspera.contains(idUsuario) || asignaciones.containsKey(idUsuario)) {
            throw new UsuarioYaEnColaException(
                    "Ya estas en cola o con una partida asignada pendiente de unirte");
        }
        boolean primeroDelLote = colaEspera.isEmpty();
        colaEspera.add(idUsuario);
        if (primeroDelLote) {
            timeoutPendiente = executor.schedule(this::completarLotePorTimeout,
                    configMatchmaking.getTimeoutSegundos(), TimeUnit.SECONDS);
        }
        if (colaEspera.size() >= configJuego.getJugadoresPorPartida()) {
            cancelarTimeoutPendiente();
            completarLote();
        }
    }

    private EstadoCola consultarEstadoInterno(Long idUsuario) {
        limpiarSiVencida(idUsuario);
        Asignacion asignacion = asignaciones.get(idUsuario);
        if (asignacion != null) {
            return EstadoCola.asignada(asignacion.getIdPartida());
        }
        if (colaEspera.contains(idUsuario)) {
            return EstadoCola.enCola(colaEspera.size());
        }
        return EstadoCola.fueraDeCola();
    }

    /** Vencido el timeout, completa con lo que haya en cola (puede ser menos de un lote lleno). */
    private void completarLotePorTimeout() {
        if (!colaEspera.isEmpty()) {
            completarLote();
        }
    }

    private void completarLote() {
        List<Long> idsHumanos = new ArrayList<>(colaEspera);
        colaEspera.clear();
        GameLoop loop = gestorPartidas.crearPartida(idsHumanos);
        long expiraEnMillis = System.currentTimeMillis() + TTL_ASIGNACION_MILLIS;
        for (Long idUsuario : idsHumanos) {
            asignaciones.put(idUsuario, new Asignacion(loop.getIdPartida(), expiraEnMillis));
        }
    }

    private void cancelarTimeoutPendiente() {
        if (timeoutPendiente != null) {
            timeoutPendiente.cancel(false);
            timeoutPendiente = null;
        }
    }

    private void limpiarSiVencida(Long idUsuario) {
        Asignacion asignacion = asignaciones.get(idUsuario);
        if (asignacion != null && asignacion.getExpiraEnMillis() < System.currentTimeMillis()) {
            asignaciones.remove(idUsuario);
        }
    }

    private <T> T ejecutarEnElActor(Callable<T> tarea) {
        try {
            return executor.submit(tarea).get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrumpido esperando al actor de matchmaking", e);
        } catch (ExecutionException e) {
            Throwable causa = e.getCause();
            if (causa instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new IllegalStateException(causa);
        }
    }

    @Getter
    @RequiredArgsConstructor
    private static class Asignacion {
        private final String idPartida;
        private final long expiraEnMillis;
    }
}
