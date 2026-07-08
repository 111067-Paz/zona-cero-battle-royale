package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.combate.Arma;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

/**
 * Un jugador dentro de una partida (PLAN §4.1). Un bot ES un Jugador cuya intencion la escribe una
 * estrategia; la simulacion no distingue humano de bot.
 *
 * <p>Modela los DOS ejes independientes de R26: {@link EstadoVida} (vivo/muerto) y {@code conectado}.
 * Un desconectado sigue VIVO y por eso vulnerable. Todas las mutaciones ocurren SOLO en el hilo del
 * loop de la partida (PLAN §2.4): no hay sincronizacion interna a proposito.
 */
@Getter
public class Jugador {

    private final String id;

    /** Orden en que se unio a la partida. Da el desempate determinista al ordenar comandos (§7-C). */
    private final int ordenUnion;

    private final IntencionJugador intencion = new IntencionJugador();

    private Vector2 posicion;
    private double angulo = 0.0;
    private int hp;
    private EstadoVida estadoVida = EstadoVida.VIVO;
    private boolean conectado = true;

    /** Arma equipada. La Partida asigna la inicial (Pistola, R17); el loot la cambia (F4). */
    private Arma arma;

    /** Ticks que faltan para poder volver a disparar. La cadencia es server-side (anti macro). */
    private int cooldownRestante = 0;

    private int kills = 0;

    /** Vida maxima (= vida inicial, R32: igual para todos). Tope de {@link #usarBotiquin()}. */
    private final int vidaMaxima;

    private static final int MAX_BOTIQUINES = 3;
    private static final int CURACION_BOTIQUIN = 50;

    /** Botiquines en inventario (0-3, R28). */
    private int botiquines = 0;

    /** Resto fraccional de dano de zona sin aplicar todavia; exacto tras 30 ticks (§7-E). */
    @Getter(AccessLevel.NONE)
    private double acumuladorDanioZona = 0.0;

    /** Acciones one-shot pendientes de este tick (RECOGER/USAR_BOTIQUIN), cap 2 (§5.1/§5.3). */
    @Getter(AccessLevel.NONE)
    private final List<AccionJugador> accionesPendientes = new ArrayList<>();

    /** Ultima secuencia de INPUT procesada. Base del descarte anti-replay/duplicado (§5.1). */
    private long ultimaSec = 0L;

    public Jugador(String id, int ordenUnion, Vector2 posicionInicial, int hpInicial) {
        this.id = id;
        this.ordenUnion = ordenUnion;
        this.posicion = posicionInicial;
        this.hp = hpInicial;
        this.vidaMaxima = hpInicial;
    }

    /**
     * Aplica un INPUT respetando la secuencia estricta: si {@code sec} no supera a la ultima vista,
     * se descarta en silencio (anti-replay, anti-duplicado, anti-reordenamiento) y devuelve false.
     * Caso contrario reemplaza la intencion vigente (last-wins) y avanza {@link #ultimaSec}.
     */
    public boolean aplicarInput(long sec, Vector2 mover, double apuntar, boolean disparar,
                                List<AccionJugador> acciones) {
        if (sec <= ultimaSec) {
            return false;
        }
        intencion.reemplazar(mover, apuntar, disparar);
        ultimaSec = sec;
        if (acciones != null) {
            for (AccionJugador accion : acciones) {
                encolarAccion(accion);
            }
        }
        return true;
    }

    /** Reubica al jugador. Solo la {@link Partida} lo llama, dentro del tick. */
    void moverA(Vector2 nuevaPosicion) {
        this.posicion = nuevaPosicion;
    }

    /** Fija el angulo de apuntado. Solo la {@link Partida} lo llama, dentro del tick. */
    void apuntarA(double nuevoAngulo) {
        this.angulo = nuevoAngulo;
    }

    /** Equipa un arma (loadout inicial o loot). */
    public void equipar(Arma arma) {
        this.arma = arma;
    }

    /**
     * Escribe la intencion desde una fuente interna CONFIABLE (la IA de un bot), sin control de
     * secuencia. Es el equivalente de {@link #aplicarInput} para fuentes que no son la red: termina
     * en la MISMA {@code IntencionJugador} que un humano, de modo que el resto del tick no distingue
     * quien la escribio (PLAN §4.1).
     */
    public void definirIntencion(Vector2 mover, double apuntar, boolean disparar) {
        intencion.reemplazar(mover, apuntar, disparar);
    }

    public boolean estaVivo() {
        return estadoVida == EstadoVida.VIVO;
    }

    public boolean estaEnCooldown() {
        return cooldownRestante > 0;
    }

    /** Arranca el enfriamiento tras disparar (cadencia del arma, en ticks). */
    void reiniciarCooldown(int ticks) {
        this.cooldownRestante = ticks;
    }

    /** Baja el cooldown un tick (no baja de cero). Lo llama la Partida cada tick. */
    void decrementarCooldown() {
        if (cooldownRestante > 0) {
            cooldownRestante--;
        }
    }

    /** Aplica dano; si la vida llega a cero, el jugador muere (queda de espectador). */
    void recibirDanio(int dano) {
        hp -= dano;
        if (hp <= 0) {
            hp = 0;
            estadoVida = EstadoVida.MUERTO;
        }
    }

    void sumarKill() {
        kills++;
    }

    /** Encola una accion one-shot; tope 2 vigentes (§5.1/§5.3, defensa anti-spam). */
    private void encolarAccion(AccionJugador accion) {
        if (accionesPendientes.size() < 2) {
            accionesPendientes.add(accion);
        }
    }

    /** Devuelve y limpia las acciones pendientes. La {@link Partida} las consume una vez por tick. */
    List<AccionJugador> drenarAcciones() {
        List<AccionJugador> copia = new ArrayList<>(accionesPendientes);
        accionesPendientes.clear();
        return copia;
    }

    /** Suma un botiquin si hay lugar. Devuelve false (no-op) si ya tiene el maximo (R28/R37). */
    boolean sumarBotiquin() {
        if (botiquines >= MAX_BOTIQUINES) {
            return false;
        }
        botiquines++;
        return true;
    }

    /** Consume un botiquin y cura, sin superar la vida maxima. Sin botiquin, no-op (descartado). */
    void usarBotiquin() {
        if (botiquines <= 0) {
            return;
        }
        botiquines--;
        hp = Math.min(vidaMaxima, hp + CURACION_BOTIQUIN);
    }

    /**
     * Acumula dano de zona fraccional y aplica el entero acumulado cuando llega a 1 (§7-E): asi el
     * dano total tras 30 ticks es EXACTO, sin perder precision por redondeo por tick.
     */
    void aplicarDanioZonaFraccional(double danioPorSegundo, double dt) {
        acumuladorDanioZona += danioPorSegundo * dt;
        if (acumuladorDanioZona >= 1.0) {
            int entero = (int) acumuladorDanioZona;
            acumuladorDanioZona -= entero;
            recibirDanio(entero);
        }
    }

    public void marcarDesconectado() {
        this.conectado = false;
        intencion.detener();
    }

    public void marcarConectado() {
        this.conectado = true;
    }
}
