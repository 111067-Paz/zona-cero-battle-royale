package ar.pazluciano.battleroyale.juego.motor;

import lombok.Value;

/**
 * Estado de un usuario frente al matchmaking (PLAN §5.5, R21), en las 3 formas posibles: todavia
 * no se encolo, esperando en la cola, o ya con partida asignada. {@code plataforma} lo traduce a
 * su propio DTO — este tipo no sale del modulo {@code juego}.
 */
@Value
public class EstadoCola {

    boolean enCola;
    Integer jugadoresEncontrados;
    String idPartida;

    public static EstadoCola enCola(int jugadoresEncontrados) {
        return new EstadoCola(true, jugadoresEncontrados, null);
    }

    public static EstadoCola asignada(String idPartida) {
        return new EstadoCola(false, null, idPartida);
    }

    public static EstadoCola fueraDeCola() {
        return new EstadoCola(false, null, null);
    }
}
