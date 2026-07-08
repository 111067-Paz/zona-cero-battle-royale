package ar.pazluciano.battleroyale.juego.dominio.bots;

/**
 * Provee las instancias singleton de los estados. Los estados se piden sus vecinos aca (en vez de
 * {@code new}-earse entre si), lo que desacopla las transiciones: agregar un estado no obliga a que
 * los demas lo conozcan por su clase concreta.
 *
 * <p>Los estados son stateless (la memoria por bot vive en {@link MemoriaBot}), asi que compartir una
 * unica instancia de cada uno es seguro.
 */
public class RepertorioEstados {

    private final EstadoComportamiento merodeando = new Merodeando();
    private final EstadoComportamiento persiguiendo = new Persiguiendo();
    private final EstadoComportamiento atacando = new Atacando();

    public EstadoComportamiento merodeando() {
        return merodeando;
    }

    public EstadoComportamiento persiguiendo() {
        return persiguiendo;
    }

    public EstadoComportamiento atacando() {
        return atacando;
    }
}
