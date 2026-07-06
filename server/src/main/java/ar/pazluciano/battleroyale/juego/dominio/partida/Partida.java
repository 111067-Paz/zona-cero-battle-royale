package ar.pazluciano.battleroyale.juego.dominio.partida;

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
 * <p>Fase 0: arranca hardcodeada en {@link EstadoPartida#EN_CURSO} con un solo movimiento posible
 * (desplazamiento con clamp a los bordes del mundo). El resto de estados, combate y zona llegan en
 * fases siguientes SIN tocar esta firma.
 */
@Getter
public class Partida {

    /** Fraccion del mundo que se deja como margen de spawn para no nacer pegado al borde. */
    private static final double MARGEN_SPAWN_EN_RADIOS = 4.0;

    private final String id;
    private final ParametrosSimulacion params;
    private final Random rng;

    /** LinkedHashMap: lookup O(1) por id + iteracion en orden de insercion (determinismo). */
    private final Map<String, Jugador> jugadores = new LinkedHashMap<>();

    private final EstadoPartida estado = EstadoPartida.EN_CURSO;
    private final long tickInicio = 0L;

    private long tick = 0L;
    private int proximoOrdenUnion = 0;

    public Partida(String id, ParametrosSimulacion params, long semilla) {
        this.id = id;
        this.params = params;
        this.rng = new Random(semilla);
    }

    /**
     * Alta de un jugador con posicion de spawn deterministica (derivada del RNG sembrado). Nace VIVO,
     * conectado y con la vida inicial. Devuelve el jugador creado para que el motor lo referencie.
     */
    public Jugador agregarJugador(String idJugador) {
        Jugador jugador = new Jugador(idJugador, proximoOrdenUnion++, spawnDeterminista(), params.getVidaInicial());
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
     * Avanza la simulacion un paso fijo {@code dt}. Fase 0: mueve a cada jugador VIVO segun su
     * intencion (re-normalizada para no exceder la velocidad) y lo mantiene dentro de los bordes del
     * mundo por clamp (deslizamiento contra el borde). Al final incrementa el contador de tick.
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
        jugador.moverA(dentroDeLosBordes(destino));
        jugador.apuntarA(jugador.getIntencion().getApuntar());
    }

    /** Mantiene el centro del circulo a distancia >= radio de cada borde (clamp por eje). */
    private Vector2 dentroDeLosBordes(Vector2 posicion) {
        double minimo = params.getRadioJugador();
        double maximo = params.getMundo() - params.getRadioJugador();
        double x = Math.min(maximo, Math.max(minimo, posicion.getX()));
        double y = Math.min(maximo, Math.max(minimo, posicion.getY()));
        return new Vector2(x, y);
    }

    private Vector2 spawnDeterminista() {
        double margen = params.getRadioJugador() * MARGEN_SPAWN_EN_RADIOS;
        double rango = params.getMundo() - 2 * margen;
        double x = margen + rng.nextDouble() * rango;
        double y = margen + rng.nextDouble() * rango;
        return new Vector2(x, y);
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
