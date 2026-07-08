package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import ar.pazluciano.battleroyale.juego.dominio.combate.ColisionSegmento;
import ar.pazluciano.battleroyale.juego.dominio.combate.EspecificacionDisparo;
import ar.pazluciano.battleroyale.juego.dominio.combate.EventoKill;
import ar.pazluciano.battleroyale.juego.dominio.combate.ImpactoSegmento;
import ar.pazluciano.battleroyale.juego.dominio.combate.Proyectil;
import ar.pazluciano.battleroyale.juego.dominio.combate.TipoArma;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.dominio.mapa.ObstaculoAABB;
import ar.pazluciano.battleroyale.juego.dominio.mapa.ResolutorColisiones;
import ar.pazluciano.battleroyale.juego.dominio.participante.Comportamiento;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaHumano;
import ar.pazluciano.battleroyale.juego.dominio.participante.FabricaParticipante;
import ar.pazluciano.battleroyale.juego.dominio.participante.VistaMundo;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

/**
 * Raiz del agregado de simulacion (PLAN §4.1). POJO puro: no conoce Spring, JPA, red ni reloj de
 * pared. Toda su mutacion ocurre en el hilo del loop de su partida, a traves de metodos que reciben
 * argumentos PLANOS. Determinismo total (PLAN §2.7): dt fijo, RNG con semilla, orden estable.
 *
 * <p>Fase 2: sobre el mundo con obstaculos de la Fase 1, agrega COMBATE. Cada tick, en orden: mover
 * jugadores, avanzar proyectiles por segmento (anti-tunneling) resolviendo impactos en orden de
 * {@code idRed}, procesar disparos nuevos (cooldown server-side) y decrementar cooldowns. Los kills se
 * acumulan como {@link EventoKill} para que el motor los emita DESPUES del snapshot (R22).
 */
@Getter
public class Partida implements VistaMundo {

    /** Vida maxima de un proyectil sin impactar (tope de seguridad; paredes/bordes lo matan antes). */
    private static final long VIDA_PROYECTIL_TICKS = 120L;

    private final String id;
    private final MapaJuego mapa;
    private final ParametrosSimulacion params;

    /** RNG sembrado, fuente de aleatoriedad deterministica (dispersion de escopeta, botin: F4). */
    @Getter(AccessLevel.NONE)
    private final Random rng;

    @Getter(AccessLevel.NONE)
    private final ResolutorColisiones resolutor = new ResolutorColisiones();

    @Getter(AccessLevel.NONE)
    private final ColisionSegmento colisionSegmento = new ColisionSegmento();

    /** LinkedHashMap: lookup O(1) por id + iteracion en orden de insercion (determinismo). */
    private final Map<String, Jugador> jugadores = new LinkedHashMap<>();

    /** Fuente de intencion de cada participante: Null Object para humanos, FSM para bots. */
    @Getter(AccessLevel.NONE)
    private final Map<String, Comportamiento> comportamientos = new LinkedHashMap<>();

    /** Proyectiles en vuelo, en orden de creacion = orden de idRed (determinismo de daños). */
    @Getter(AccessLevel.NONE)
    private final List<Proyectil> proyectiles = new ArrayList<>();

    @Getter(AccessLevel.NONE)
    private final List<EventoKill> eventosPendientes = new ArrayList<>();

    private final EstadoPartida estado = EstadoPartida.EN_CURSO;
    private final long tickInicio = 0L;

    private long tick = 0L;
    private int proximoOrdenUnion = 0;

    @Getter(AccessLevel.NONE)
    private long contadorIdRed = 0L;

    public Partida(String id, MapaJuego mapa, ParametrosSimulacion params, long semilla) {
        this.id = id;
        this.mapa = mapa;
        this.params = params;
        this.rng = new Random(semilla);
    }

    /** Alta de un HUMANO: usa la {@link FabricaHumano} (Pistola + Null Object, R17). */
    public Jugador agregarJugador(String idJugador) {
        return agregarParticipante(idJugador, new FabricaHumano());
    }

    /**
     * Alta de un participante (humano o bot) con su fabrica (Abstract Factory): nace en un spawn del
     * mapa, VIVO, con el arma y el comportamiento que dicta el arquetipo. Asi humanos y bots se crean
     * por el MISMO camino (§4.1); la unica diferencia es el comportamiento que trae la familia.
     */
    public Jugador agregarParticipante(String idJugador, FabricaParticipante fabrica) {
        int ordenUnion = proximoOrdenUnion++;
        Jugador jugador = new Jugador(idJugador, ordenUnion, mapa.spawnPara(ordenUnion), params.getVidaInicial());
        jugador.equipar(fabrica.crearArma(rng));
        jugadores.put(idJugador, jugador);
        comportamientos.put(idJugador, fabrica.crearComportamiento());
        return jugador;
    }

    public void quitarJugador(String idJugador) {
        jugadores.remove(idJugador);
        comportamientos.remove(idJugador);
    }

    public Optional<Jugador> buscarJugador(String idJugador) {
        return Optional.ofNullable(jugadores.get(idJugador));
    }

    public void aplicarInput(String idJugador, long sec, Vector2 mover, double apuntar, boolean disparar) {
        Jugador jugador = jugadores.get(idJugador);
        if (jugador == null) {
            return;
        }
        jugador.aplicarInput(sec, mover, apuntar, disparar);
    }

    /**
     * Avanza la simulacion un paso fijo {@code dt}, en orden determinista: mueve a los VIVOS, avanza
     * los proyectiles existentes (resolviendo impactos), procesa los disparos nuevos (que aparecen en
     * la boca del arma y recien se mueven el proximo tick) y decrementa cooldowns.
     */
    public void avanzarTick() {
        pensarParticipantes();
        for (Jugador jugador : jugadores.values()) {
            if (jugador.estaVivo()) {
                simularMovimiento(jugador);
            }
        }
        avanzarProyectiles();
        procesarDisparos();
        decrementarCooldowns();
        tick++;
    }

    /**
     * Cada participante VIVO "piensa" su intencion, en orden estable. El humano tiene un Null Object
     * que no hace nada (su intencion ya llego por la red); el bot corre su FSM. Despues de esto, el
     * resto del tick es ciego a quien escribio la intencion — cero {@code if(esBot)} (§4.1).
     */
    private void pensarParticipantes() {
        for (Jugador jugador : jugadores.values()) {
            if (!jugador.estaVivo()) {
                continue;
            }
            Comportamiento comportamiento = comportamientos.get(jugador.getId());
            if (comportamiento != null) {
                comportamiento.pensar(jugador, this, rng);
            }
        }
    }

    private void simularMovimiento(Jugador jugador) {
        Vector2 direccion = jugador.getIntencion().getMover().conLongitudMaxima(1.0);
        Vector2 desplazamiento = direccion.escalar(params.getVelocidadJugador() * params.getDt());
        Vector2 destino = jugador.getPosicion().sumar(desplazamiento);
        jugador.moverA(resolutor.resolver(destino, params.getRadioJugador(), mapa));
        jugador.apuntarA(jugador.getIntencion().getApuntar());
    }

    /**
     * Avanza cada proyectil su segmento del tick, en orden de idRed. Recorta contra obstaculos y
     * jugadores VIVOS (conectados o no, R26) excepto el dueno; el impacto mas cercano decide. Los
     * proyectiles que impactan, expiran o salen del mapa se quitan.
     */
    private void avanzarProyectiles() {
        double radio = params.getRadioJugador();
        List<ObstaculoAABB> obstaculos = mapa.getObstaculos();
        Iterator<Proyectil> iterador = proyectiles.iterator();
        while (iterador.hasNext()) {
            Proyectil proyectil = iterador.next();
            Vector2 origen = proyectil.getPosicion();
            Vector2 destino = proyectil.destinoDelTick();
            List<Jugador> objetivos = rivalesVivos(proyectil.getIdDueno());
            ImpactoSegmento impacto = colisionSegmento.primerImpacto(origen, destino, obstaculos, objetivos, radio);

            if (impacto.impactoJugador()) {
                aplicarImpacto(proyectil, impacto.getVictima());
                iterador.remove();
            } else if (impacto.huboImpacto()) {
                iterador.remove(); // pared
            } else {
                proyectil.avanzarA(destino);
                if (fueraDeMapa(destino) || proyectil.expiroEn(tick)) {
                    iterador.remove();
                }
            }
        }
    }

    private void aplicarImpacto(Proyectil proyectil, Jugador victima) {
        boolean estabaVivo = victima.estaVivo();
        victima.recibirDanio(proyectil.getDano());
        if (estabaVivo && !victima.estaVivo()) {
            buscarJugador(proyectil.getIdDueno()).ifPresent(Jugador::sumarKill);
            eventosPendientes.add(new EventoKill(proyectil.getIdDueno(), victima.getId(), proyectil.getArma()));
        }
    }

    private void procesarDisparos() {
        for (Jugador jugador : jugadores.values()) {
            if (jugador.estaVivo() && jugador.getIntencion().isDisparar() && !jugador.estaEnCooldown()) {
                disparar(jugador);
            }
        }
    }

    private void disparar(Jugador jugador) {
        Arma arma = jugador.getArma();
        List<EspecificacionDisparo> disparos = arma.disparar(jugador.getAngulo(), rng);
        for (EspecificacionDisparo especificacion : disparos) {
            proyectiles.add(crearProyectil(jugador, especificacion, arma.tipo()));
        }
        jugador.reiniciarCooldown(arma.cadenciaTicks());
    }

    private Proyectil crearProyectil(Jugador dueno, EspecificacionDisparo especificacion, TipoArma tipo) {
        double vx = Math.cos(especificacion.getAngulo()) * especificacion.getVelocidad() * params.getDt();
        double vy = Math.sin(especificacion.getAngulo()) * especificacion.getVelocidad() * params.getDt();
        long idRed = contadorIdRed++;
        return new Proyectil(idRed, dueno.getPosicion(), new Vector2(vx, vy),
                especificacion.getDano(), dueno.getId(), tipo, tick + VIDA_PROYECTIL_TICKS);
    }

    private void decrementarCooldowns() {
        for (Jugador jugador : jugadores.values()) {
            jugador.decrementarCooldown();
        }
    }

    /** VistaMundo: jugadores VIVOS distintos del propio (conectados o no, R26). Reusado por combate y bots. */
    @Override
    public List<Jugador> rivalesVivos(String idPropio) {
        List<Jugador> rivales = new ArrayList<>();
        for (Jugador jugador : jugadores.values()) {
            if (jugador.estaVivo() && !jugador.getId().equals(idPropio)) {
                rivales.add(jugador);
            }
        }
        return rivales;
    }

    /** VistaMundo: raycast desde->hasta contra obstaculos (sin jugadores). Hay vista si no hay pared. */
    @Override
    public boolean hayLineaDeVista(Vector2 desde, Vector2 hasta) {
        return !colisionSegmento.primerImpacto(desde, hasta, mapa.getObstaculos(), List.of(), 0.0).huboImpacto();
    }

    private boolean fueraDeMapa(Vector2 posicion) {
        return posicion.getX() < 0 || posicion.getX() > mapa.getAncho()
                || posicion.getY() < 0 || posicion.getY() > mapa.getAlto();
    }

    /** Vista de solo lectura de los jugadores, en orden determinista, para construir el snapshot. */
    public Collection<Jugador> jugadoresVisibles() {
        return Collections.unmodifiableCollection(jugadores.values());
    }

    /** Vista de solo lectura de los proyectiles en vuelo, para construir el snapshot. */
    public List<Proyectil> proyectilesVisibles() {
        return Collections.unmodifiableList(proyectiles);
    }

    /** Devuelve y limpia los eventos acumulados en el tick. El motor los emite DESPUES del snapshot. */
    public List<EventoKill> drenarEventos() {
        List<EventoKill> copia = new ArrayList<>(eventosPendientes);
        eventosPendientes.clear();
        return copia;
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
