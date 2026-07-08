package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.dominio.participante.VistaMundo;

import java.util.List;

/**
 * Doble de prueba de {@link VistaMundo}: devuelve una lista fija de rivales y una linea de vista
 * controlada, para testear la percepcion y la FSM sin montar una Partida completa.
 */
class MundoFalso implements VistaMundo {

    private final List<Jugador> rivales;
    private final boolean lineaDeVista;

    MundoFalso(List<Jugador> rivales, boolean lineaDeVista) {
        this.rivales = rivales;
        this.lineaDeVista = lineaDeVista;
    }

    @Override
    public List<Jugador> rivalesVivos(String idPropio) {
        return rivales;
    }

    @Override
    public boolean hayLineaDeVista(Vector2 desde, Vector2 hasta) {
        return lineaDeVista;
    }
}
