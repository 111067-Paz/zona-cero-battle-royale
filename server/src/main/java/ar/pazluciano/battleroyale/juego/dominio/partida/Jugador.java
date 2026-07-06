package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Getter;

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

    /** Ultima secuencia de INPUT procesada. Base del descarte anti-replay/duplicado (§5.1). */
    private long ultimaSec = 0L;

    public Jugador(String id, int ordenUnion, Vector2 posicionInicial, int hpInicial) {
        this.id = id;
        this.ordenUnion = ordenUnion;
        this.posicion = posicionInicial;
        this.hp = hpInicial;
    }

    /**
     * Aplica un INPUT respetando la secuencia estricta: si {@code sec} no supera a la ultima vista,
     * se descarta en silencio (anti-replay, anti-duplicado, anti-reordenamiento) y devuelve false.
     * Caso contrario reemplaza la intencion vigente (last-wins) y avanza {@link #ultimaSec}.
     */
    public boolean aplicarInput(long sec, Vector2 mover, double apuntar, boolean disparar) {
        if (sec <= ultimaSec) {
            return false;
        }
        intencion.reemplazar(mover, apuntar, disparar);
        ultimaSec = sec;
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

    public void marcarDesconectado() {
        this.conectado = false;
        intencion.detener();
    }

    public void marcarConectado() {
        this.conectado = true;
    }
}
