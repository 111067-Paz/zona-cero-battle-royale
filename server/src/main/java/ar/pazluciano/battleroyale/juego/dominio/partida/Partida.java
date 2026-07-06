package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.dominio.mapa.ResolutorColisiones;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

/**
 * Raiz del agregado de simulacion (PLAN §4.1). Es un POJO puro: no conoce Spring, JPA, red ni
 * reloj de pared. Toda su mutacion ocurre en el hilo del loop de su partida y unicamente a traves
 * de sus metodos, que reciben argumentos PLANOS (los comandos del protocolo no entran al dominio).
 *
 * <p>Determinismo total (PLAN §2.7): dt fijo, RNG con semilla por partida (jamas {@code Math.random}),
 * e iteracion estable de jugadores. Misma semilla + misma secuencia de comandos = mismo resultado.
 *
 * <p>Fase 1: arranca hardcodeada en {@link EstadoPartida#EN_CURSO} sobre un {@link MapaJuego} con
 * obstaculos. El movimiento resuelve colision circulo-vs-AABB con deslizamiento y los spawns salen de
 * los puntos validados del mapa. El resto de estados, combate y zona llegan en fases siguientes.
 */
@Getter
public class Partida {

    private final String id;
    private final MapaJuego mapa;
    private final ParametrosSimulacion params;

    /** RNG sembrado, fuente de aleatoriedad deterministica de la partida (dispersion, botin: F2+). */
    @Getter(AccessLevel.NONE)
    private final Random rng;

    @Getter(AccessLevel.NONE)
    private final ResolutorColisiones resolutor = new ResolutorColisiones();

    /** LinkedHashMap: lookup O(1) por id + iteracion en orden de insercion (determinismo). */
    private final Map<String, Jugador> jugadores = new LinkedHashMap<>();

    private final EstadoPartida estado = EstadoPartida.EN_CURSO;
    private final long tickInicio = 0L;

    private long tick = 0L;
    private int proximoOrdenUnion = 0;

    public Partida(String id, MapaJuego mapa, ParametrosSimulacion params, long semilla) {
        this.id = id;
        this.mapa = mapa;
        this.params = params;
        this.rng = new Random(semilla);
    }

    /**
     * Alta de un jugador en un spawn del mapa (asignado por orden de union, ya validado libre de
     * obstaculos). Nace VIVO, conectado y con la vida inicial. Devuelve el jugador para que el motor
     * lo referencie.
     */
    public Jugador agregarJugador(String idJugador) {
        int ordenUnion = proximoOrdenUnion++;
        Jugador jugador = new Jugador(idJugador, ordenUnion, mapa.spawnPara(ordenUnion), params.getVidaInicial());
        jugadores.put(idJugador, jugador);
        return jugador;
    }

    public void quitarJugador(String idJugador) {
        jugadores.remove(idJugador);
    }

    public Optional<Jugador> buscarJugador(String idJugador) {
        return Optional.ofNullable(jugadores.get(idJugador));
    }

    /**
     * Aplica un INPUT a su jugador. Si el jugador no existe, se ignora en silencio (pudo haber salido
     * el mismo tick). El descarte por secuencia lo decide el propio {@link Jugador}.
     */
    public void aplicarInput(String idJugador, long sec, Vector2 mover, double apuntar, boolean disparar) {
        Jugador jugador = jugadores.get(idJugador);
        if (jugador == null) {
            return;
        }
        jugador.aplicarInput(sec, mover, apuntar, disparar);
    }

    /**
     * Avanza la simulacion un paso fijo {@code dt}: mueve a cada jugador VIVO segun su intencion
     * (re-normalizada para no exceder la velocidad) y resuelve la colision contra obstaculos y bordes
     * con deslizamiento. Al final incrementa el contador de tick.
     */
    public void avanzarTick() {
        for (Jugador jugador : jugadores.values()) {
            if (jugador.getEstadoVida() != EstadoVida.VIVO) {
                continue;
            }
            simularMovimiento(jugador);
        }
        tick++;
    }

    private void simularMovimiento(Jugador jugador) {
        Vector2 direccion = jugador.getIntencion().getMover().conLongitudMaxima(1.0);
        Vector2 desplazamiento = direccion.escalar(params.getVelocidadJugador() * params.getDt());
        Vector2 destino = jugador.getPosicion().sumar(desplazamiento);
        jugador.moverA(resolutor.resolver(destino, params.getRadioJugador(), mapa));
        jugador.apuntarA(jugador.getIntencion().getApuntar());
    }

    /** Vista de solo lectura de los jugadores, en orden determinista, para construir el snapshot. */
    public Collection<Jugador> jugadoresVisibles() {
        return Collections.unmodifiableCollection(jugadores.values());
    }

    /** Mapa id -> ultima sec procesada, para el campo {@code acks} del snapshot (habilita la F7). */
    public Map<String, Long> acks() {
        Map<String, Long> acks = new LinkedHashMap<>();
        for (Jugador jugador : jugadores.values()) {
            acks.put(jugador.getId(), jugador.getUltimaSec());
        }
        return acks;
    }
}
