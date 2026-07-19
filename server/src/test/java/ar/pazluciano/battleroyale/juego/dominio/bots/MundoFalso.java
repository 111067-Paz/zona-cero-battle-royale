package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.dominio.participante.VistaMundo;

import java.util.List;

/**
 * Doble de prueba de {@link VistaMundo}: devuelve una lista fija de rivales, una linea de vista
 * controlada y una zona opcional, para testear la percepcion y la FSM sin montar una Partida completa.
 */
class MundoFalso implements VistaMundo {

    private final List<Jugador> rivales;
    private final boolean lineaDeVista;
    private final Vector2 centroZona;
    private final double radioZona;

    MundoFalso(List<Jugador> rivales, boolean lineaDeVista) {
        this(rivales, lineaDeVista, null, 0.0);
    }

    /** Con zona activa: {@code centroZona} no nulo define el circulo seguro de radio {@code radioZona}. */
    MundoFalso(List<Jugador> rivales, boolean lineaDeVista, Vector2 centroZona, double radioZona) {
        this.rivales = rivales;
        this.lineaDeVista = lineaDeVista;
        this.centroZona = centroZona;
        this.radioZona = radioZona;
    }

    @Override
    public List<Jugador> rivalesVivos(String idPropio) {
        return rivales;
    }

    @Override
    public boolean hayLineaDeVista(Vector2 desde, Vector2 hasta) {
        return lineaDeVista;
    }

    @Override
    public boolean hayZonaActiva() {
        return centroZona != null;
    }

    @Override
    public boolean estaDentroDeZona(Vector2 punto) {
        if (centroZona == null) {
            return true;
        }
        return Math.hypot(punto.getX() - centroZona.getX(), punto.getY() - centroZona.getY()) <= radioZona;
    }

    @Override
    public Vector2 centroZona() {
        return centroZona;
    }

    @Override
    public double radioZona() {
        return radioZona;
    }
}
