package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.participante.Comportamiento;
import ar.pazluciano.battleroyale.juego.dominio.participante.VistaMundo;

import java.util.Random;

/**
 * Comportamiento de un bot: una FSM (patron State) que sostiene el estado actual y la
 * {@link MemoriaBot} de ESE bot. Cada tick arma el {@link ContextoBot} y delega en el estado, que
 * escribe la intencion y devuelve el proximo estado. Un {@code ComportamientoFsm} por bot; los
 * estados y el repertorio son compartibles porque son stateless.
 */
public class ComportamientoFsm implements Comportamiento {

    private final DificultadBot dificultad;
    private final RepertorioEstados repertorio;
    private final PercepcionBot percepcion;
    private final MemoriaBot memoria;

    private EstadoComportamiento estadoActual;

    public ComportamientoFsm(DificultadBot dificultad) {
        this.dificultad = dificultad;
        this.repertorio = new RepertorioEstados();
        this.percepcion = new PercepcionBot();
        this.memoria = new MemoriaBot(dificultad.getReaccionTicks());
        this.estadoActual = repertorio.merodeando();
    }

    @Override
    public void pensar(Jugador jugador, VistaMundo mundo, Random rng) {
        ContextoBot contexto = new ContextoBot(jugador, mundo, memoria, rng, dificultad, percepcion);
        estadoActual = estadoActual.actuar(contexto, repertorio);
    }
}
