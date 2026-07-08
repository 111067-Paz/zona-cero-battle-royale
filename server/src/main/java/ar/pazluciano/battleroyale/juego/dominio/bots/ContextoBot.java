package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.dominio.participante.VistaMundo;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Optional;
import java.util.Random;

/**
 * Todo lo que un {@link EstadoComportamiento} necesita para decidir en un tick: el bot, su vision del
 * mundo, su memoria, el RNG sembrado, su dificultad y la percepcion. Ofrece helpers para no repetir
 * trigonometria en cada estado y para escribir la intencion.
 */
@Getter
@RequiredArgsConstructor
public class ContextoBot {

    private final Jugador jugador;
    private final VistaMundo mundo;
    private final MemoriaBot memoria;
    private final Random rng;
    private final DificultadBot dificultad;
    private final PercepcionBot percepcion;

    /** Rival mas cercano visible dentro del radio dado (o vacio). */
    public Optional<Jugador> rivalVisible(double radio) {
        return percepcion.rivalMasCercanoVisible(jugador, mundo, radio);
    }

    /** Escribe la intencion del bot en su Jugador (misma IntencionJugador que un humano, §4.1). */
    public void aplicarIntencion(Vector2 mover, double apuntar, boolean disparar) {
        jugador.definirIntencion(mover, apuntar, disparar);
    }

    public double distanciaA(Jugador objetivo) {
        return Math.hypot(objetivo.getPosicion().getX() - jugador.getPosicion().getX(),
                objetivo.getPosicion().getY() - jugador.getPosicion().getY());
    }

    public double anguloHacia(Jugador objetivo) {
        return Math.atan2(objetivo.getPosicion().getY() - jugador.getPosicion().getY(),
                objetivo.getPosicion().getX() - jugador.getPosicion().getX());
    }

    public Vector2 direccionHacia(Jugador objetivo) {
        return objetivo.getPosicion().sumar(jugador.getPosicion().escalar(-1.0)).normalizado();
    }
}
