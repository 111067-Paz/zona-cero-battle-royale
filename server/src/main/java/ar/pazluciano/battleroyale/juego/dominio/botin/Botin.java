package ar.pazluciano.battleroyale.juego.dominio.botin;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import lombok.Getter;

/**
 * Un item en el suelo (PLAN §4.1): tipo, posicion y disponibilidad. Nace disponible; al recogerse
 * queda marcado y deja de listarse en el snapshot.
 */
@Getter
public class Botin {

    private final long id;
    private final Vector2 posicion;
    private final TipoBotin tipo;
    private boolean disponible = true;

    public Botin(long id, Vector2 posicion, TipoBotin tipo) {
        this.id = id;
        this.posicion = posicion;
        this.tipo = tipo;
    }

    public boolean esBotiquin() {
        return tipo == TipoBotin.BOTIQUIN;
    }

    /** Lo llama la {@code Partida} (paquete distinto: dominio.partida) al procesar un RECOGER exitoso. */
    public void marcarRecogido() {
        this.disponible = false;
    }
}
