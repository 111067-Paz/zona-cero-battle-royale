package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.botin.Botin;
import ar.pazluciano.battleroyale.juego.dominio.botin.FabricaBotin;
import ar.pazluciano.battleroyale.juego.dominio.botin.TipoBotin;
import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import ar.pazluciano.battleroyale.juego.dominio.combate.ColisionSegmento;
import ar.pazluciano.battleroyale.juego.dominio.combate.Escopeta;
import ar.pazluciano.battleroyale.juego.dominio.combate.EspecificacionDisparo;
import ar.pazluciano.battleroyale.juego.dominio.combate.ImpactoSegmento;
import ar.pazluciano.battleroyale.juego.dominio.combate.Pistola;
import ar.pazluciano.battleroyale.juego.dominio.combate.Proyectil;
import ar.pazluciano.battleroyale.juego.dominio.combate.Rifle;
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
import java.util.Comparator;
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
 * <p>Fase 4: el ciclo de vida completo, patron State (PLAN §4.3): {@link EnLobby} -&gt;
 * {@link CuentaRegresiva} -&gt; {@link EnCurso} -&gt; {@link Finalizada}. {@code avanzarTick()} solo
 * delega al estado actual; toda la logica de "partida jugable" (mover, disparar, zona, botin, acciones)
 * vive en {@link #ejecutarTickJugable()}, que unicamente {@link EnCurso} invoca.
 */
@Getter
public class Partida implements VistaMundo {

    private static final long VIDA_PROYECTIL_TICKS = 120L;
    private static final double RANGO_RECOGER = 2.0;

    private final String id;
    private final MapaJuego mapa;
    private final ParametrosSimulacion params;
    private final ParametrosCiclo ciclo;

    @Getter(AccessLevel.NONE)
    private final ParametrosZona parametrosZona;

    @Getter(AccessLevel.NONE)
    private final Random rng;

    @Getter(AccessLevel.NONE)
    private final ResolutorColisiones resolutor = new ResolutorColisiones();

    @Getter(AccessLevel.NONE)
    private final ColisionSegmento colisionSegmento = new ColisionSegmento();

    @Getter(AccessLevel.NONE)
    private final FabricaBotin fabricaBotin = new FabricaBotin();

    /** LinkedHashMap: lookup O(1) por id + iteracion en orden de insercion (determinismo). */
    private final Map<String, Jugador> jugadores = new LinkedHashMap<>();

    /** Fuente de intencion de cada participante: Null Object para humanos, FSM para bots. */
    @Getter(AccessLevel.NONE)
    private final Map<String, Comportamiento> comportamientos = new LinkedHashMap<>();

    /** Proyectiles en vuelo, en orden de creacion = orden de idRed (determinismo de daños). */
    @Getter(AccessLevel.NONE)
    private final List<Proyectil> proyectiles = new ArrayList<>();

    /** Botin en el mapa, poblado al entrar EN_CURSO. */
    @Getter(AccessLevel.NONE)
    private final List<Botin> botines = new ArrayList<>();

    @Getter(AccessLevel.NONE)
    private final List<EventoDominio> eventosPendientes = new ArrayList<>();

    /** Orden de muerte, primero el que murio primero. Base de TOP3/posicionFinal (F5, R38). */
    @Getter(AccessLevel.NONE)
    private final List<String> ordenEliminacion = new ArrayList<>();

    /** HP de cada jugador al INICIO del tick jugable: primer criterio de desempate (§8.3). */
    @Getter(AccessLevel.NONE)
    private final Map<String, Integer> hpAlInicioTick = new LinkedHashMap<>();

    @Getter(AccessLevel.NONE)
    private EstadoDePartida estadoActual = new EnLobby();

    /** Zona segura: null hasta que {@link #iniciarEnCurso()} la crea. */
    private ZonaSegura zona;

    private ResultadoFinal resultadoFinal;

    private long tick = 0L;
    private long tickInicio = 0L;
    private int proximoOrdenUnion = 0;

    @Getter(AccessLevel.NONE)
    private long contadorIdRed = 0L;

    @Getter(AccessLevel.NONE)
    private long contadorIdBotin = 0L;

    public Partida(String id, MapaJuego mapa, ParametrosSimulacion params, ParametrosCiclo ciclo,
                   ParametrosZona parametrosZona, long semilla) {
        this.id = id;
        this.mapa = mapa;
        this.params = params;
        this.ciclo = ciclo;
        this.parametrosZona = parametrosZona;
        this.rng = new Random(semilla);
    }

    /** Estado (enum) para el snapshot (R27). */
    public EstadoPartida getEstado() {
        return estadoActual.tipo();
    }

    /** Estado (objeto) para introspeccion — tests y el motor lo usan para casos especificos. */
    public EstadoDePartida estadoActual() {
        return estadoActual;
    }

    /** Ticks que faltan para EN_CURSO, solo presente durante CUENTA_REGRESIVA (R27). */
    public Optional<Integer> ticksParaInicio() {
        if (estadoActual instanceof CuentaRegresiva cuentaRegresiva) {
            return Optional.of(cuentaRegresiva.getTicksRestantes());
        }
        return Optional.empty();
    }

    /** True cuando la gracia de FINALIZADA se cumplio: el GestorPartidas puede desregistrar (§7-F). */
    public boolean graciaCumplida() {
        return estadoActual instanceof Finalizada finalizada
                && finalizada.getTicksTranscurridos() >= ciclo.getGraciaFinTicks();
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

    public void aplicarInput(String idJugador, long sec, Vector2 mover, double apuntar, boolean disparar,
                             List<AccionJugador> acciones) {
        Jugador jugador = jugadores.get(idJugador);
        if (jugador == null) {
            return;
        }
        jugador.aplicarInput(sec, mover, apuntar, disparar, acciones);
    }

    /** Un paso fijo del RELOJ de la partida: delega TODO al estado actual (State, §4.3). */
    public void avanzarTick() {
        estadoActual = estadoActual.procesarTick(this);
        tick++;
    }

    /**
     * Todo lo que hace un tick EN_CURSO, en el orden del PLAN §7-C/§7-E: pensar participantes, mover,
     * avanzar proyectiles, procesar disparos, decrementar cooldowns, tickear la zona (dano fraccional)
     * y consumir las acciones one-shot (RECOGER/USAR_BOTIQUIN). Solo lo invoca {@link EnCurso}.
     */
    void ejecutarTickJugable() {
        capturarHpAlInicioDelTick();
        pensarParticipantes();
        for (Jugador jugador : jugadores.values()) {
            if (jugador.estaVivo()) {
                simularMovimiento(jugador);
            }
        }
        avanzarProyectiles();
        procesarDisparos();
        decrementarCooldowns();
        tickearZona();
        procesarAcciones();
    }

    /** Marca el inicio real de EN_CURSO, crea la zona y puebla el botin. Solo lo invoca {@link CuentaRegresiva}. */
    void iniciarEnCurso() {
        tickInicio = tick;
        Vector2 centroMapa = new Vector2(mapa.getAncho() / 2.0, mapa.getAlto() / 2.0);
        zona = new ZonaSegura(parametrosZona, centroMapa);
        poblarBotines();
    }

    /** Arma el resultado y encola el evento de fin. Solo lo invoca {@link EnCurso}. */
    void finalizar(ResultadoFinal resultado) {
        this.resultadoFinal = resultado;
        eventosPendientes.add(new EventoFinPartida(resultado));
    }

    /**
     * SOLO PARA TESTS: agrega un botin exacto (tipo controlado), sin pasar por la fabrica aleatoria.
     * Los tests de RECOGER necesitan un tipo determinado, no lo que salga del RNG.
     */
    void agregarBotinDeTest(Botin botin) {
        botines.add(botin);
    }

    /**
     * SOLO PARA TESTS: salta lobby y cuenta regresiva, arranca directo EN_CURSO. Los tests de mecanica
     * de juego (movimiento, combate, bots) no necesitan simular la ceremonia de inicio.
     */
    void forzarInicioInmediato() {
        iniciarEnCurso();
        this.estadoActual = new EnCurso();
    }

    private void capturarHpAlInicioDelTick() {
        hpAlInicioTick.clear();
        for (Jugador jugador : jugadores.values()) {
            hpAlInicioTick.put(jugador.getId(), jugador.getHp());
        }
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
        if (estabaVivo) {
            eventosPendientes.add(new EventoImpacto(
                    victima.getId(),
                    proyectil.getDano(),
                    victima.getPosicion().getX(),
                    victima.getPosicion().getY()
            ));
        }
        if (estabaVivo && !victima.estaVivo()) {
            buscarJugador(proyectil.getIdDueno()).ifPresent(Jugador::sumarKill);
            eventosPendientes.add(new EventoKill(proyectil.getIdDueno(), victima.getId(), proyectil.getArma()));
            ordenEliminacion.add(victima.getId());
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

    /** Avanza el cronograma de la zona y aplica su dano fraccional a quien esta fuera (§7-E). */
    private void tickearZona() {
        if (zona == null) {
            return;
        }
        zona.avanzarTick();
        for (Jugador jugador : jugadores.values()) {
            if (!jugador.estaVivo() || zona.contiene(jugador.getPosicion())) {
                continue;
            }
            jugador.aplicarDanioZonaFraccional(parametrosZona.getDanioPorSegundo(), params.getDt());
            if (!jugador.estaVivo()) {
                eventosPendientes.add(new EventoMuerteZona(jugador.getId()));
                ordenEliminacion.add(jugador.getId());
            }
        }
    }

    /** Consume las acciones one-shot encoladas por cada jugador (RECOGER, USAR_BOTIQUIN). */
    private void procesarAcciones() {
        for (Jugador jugador : jugadores.values()) {
            List<AccionJugador> acciones = jugador.drenarAcciones();
            if (!jugador.estaVivo()) {
                continue;
            }
            for (AccionJugador accion : acciones) {
                switch (accion) {
                    case RECOGER -> procesarRecoger(jugador);
                    case USAR_BOTIQUIN -> jugador.usarBotiquin();
                }
            }
        }
    }

    private void procesarRecoger(Jugador jugador) {
        botinMasCercanoEnRango(jugador).ifPresent(botin -> {
            boolean aplicado = botin.esBotiquin() ? jugador.sumarBotiquin() : equiparDesdeBotin(jugador, botin);
            if (aplicado) {
                botin.marcarRecogido();
                eventosPendientes.add(new EventoRecogido(jugador.getId(), botin.getId(), botin.getTipo()));
            }
        });
    }

    private boolean equiparDesdeBotin(Jugador jugador, Botin botin) {
        jugador.equipar(armaDesde(botin.getTipo()));
        return true;
    }

    private Arma armaDesde(TipoBotin tipo) {
        return switch (tipo) {
            case PISTOLA -> new Pistola();
            case ESCOPETA -> new Escopeta();
            case RIFLE -> new Rifle();
            case BOTIQUIN -> throw new IllegalStateException("BOTIQUIN no es un arma");
        };
    }

    /** Botin disponible mas cercano en rango; empate -> menor id (R15), igual criterio que RECOGER. */
    private Optional<Botin> botinMasCercanoEnRango(Jugador jugador) {
        return botines.stream()
                .filter(Botin::isDisponible)
                .filter(botin -> distancia(botin.getPosicion(), jugador.getPosicion()) <= RANGO_RECOGER)
                .min(Comparator
                        .comparingDouble((Botin botin) -> distancia(botin.getPosicion(), jugador.getPosicion()))
                        .thenComparingLong(Botin::getId));
    }

    private void poblarBotines() {
        for (Vector2 punto : mapa.getSpawnsBotin()) {
            botines.add(fabricaBotin.crear(contadorIdBotin++, punto, rng));
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

    /** VistaMundo: la zona existe recien desde que arranca EN_CURSO ({@link #iniciarEnCurso()}). */
    @Override
    public boolean hayZonaActiva() {
        return zona != null;
    }

    /** VistaMundo: sin zona activa, todo es "seguro" (los bots no huyen de nada que no existe). */
    @Override
    public boolean estaDentroDeZona(Vector2 punto) {
        return zona == null || zona.contiene(punto);
    }

    @Override
    public Vector2 centroZona() {
        return zona.getCentro();
    }

    @Override
    public double radioZona() {
        return zona != null ? zona.getRadio() : Double.MAX_VALUE;
    }

    /**
     * Queda 1 vivo -> gana. Queda 0 vivos -> empate por: 1) mayor HP al inicio del tick, 2) mas kills,
     * 3) orden de union mas bajo (§8.3). Con 1 solo participante no hay "batalla" que resolver.
     */
    Optional<ResultadoFinal> evaluarVictoria() {
        if (jugadores.size() <= 1) {
            return Optional.empty();
        }
        List<Jugador> vivos = jugadores.values().stream().filter(Jugador::estaVivo).toList();
        if (vivos.size() == 1) {
            return Optional.of(construirResultado(vivos.get(0).getId()));
        }
        if (vivos.isEmpty()) {
            Jugador ganador = jugadores.values().stream()
                    .max(Comparator
                            .comparingInt((Jugador j) -> hpAlInicioTick.getOrDefault(j.getId(), 0))
                            .thenComparingInt(Jugador::getKills)
                            .thenComparingInt(j -> -j.getOrdenUnion()))
                    .orElseThrow();
            return Optional.of(construirResultado(ganador.getId()));
        }
        return Optional.empty();
    }

    private ResultadoFinal construirResultado(String idGanador) {
        Map<String, Integer> kills = new LinkedHashMap<>();
        for (Jugador jugador : jugadores.values()) {
            kills.put(jugador.getId(), jugador.getKills());
        }
        return new ResultadoFinal(idGanador, kills);
    }

    private boolean fueraDeMapa(Vector2 posicion) {
        return posicion.getX() < 0 || posicion.getX() > mapa.getAncho()
                || posicion.getY() < 0 || posicion.getY() > mapa.getAlto();
    }

    private double distancia(Vector2 a, Vector2 b) {
        return Math.hypot(a.getX() - b.getX(), a.getY() - b.getY());
    }

    /** Vista de solo lectura de los jugadores, en orden determinista, para construir el snapshot. */
    public Collection<Jugador> jugadoresVisibles() {
        return Collections.unmodifiableCollection(jugadores.values());
    }

    /** Vista de solo lectura de los proyectiles en vuelo, para construir el snapshot. */
    public List<Proyectil> proyectilesVisibles() {
        return Collections.unmodifiableList(proyectiles);
    }

    /** Vista de solo lectura del botin en el mapa, para construir el snapshot. */
    public List<Botin> botinesVisibles() {
        return Collections.unmodifiableList(botines);
    }

    /** Devuelve y limpia los eventos acumulados en el tick. El motor los emite DESPUES del snapshot. */
    public List<EventoDominio> drenarEventos() {
        List<EventoDominio> copia = new ArrayList<>(eventosPendientes);
        eventosPendientes.clear();
        return copia;
    }

    /** Orden de muerte (primero el que murio primero). Base de TOP3/posicionFinal (F5, R38). */
    public List<String> ordenEliminacion() {
        return List.copyOf(ordenEliminacion);
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
