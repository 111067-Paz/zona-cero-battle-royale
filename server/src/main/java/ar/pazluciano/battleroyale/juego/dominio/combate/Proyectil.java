package ar.pazluciano.battleroyale.juego.dominio.combate;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import lombok.Getter;

/**
 * Proyectil en vuelo (PLAN §4.1). Su {@code idRed} es monotonico por partida y NUNCA se recicla
 * (R2): aunque en el futuro los objetos salgan de un pool, la identidad de red siempre sera nueva,
 * para que el cliente no interpole una bala "nueva" desde la posicion de una vieja.
 *
 * <p>Avanza por SEGMENTO: cada tick recorre {@code posicion -> posicion + velocidadPorTick}, y la
 * colision se evalua sobre ese segmento completo (anti-tunneling), no solo sobre el punto final.
 */
@Getter
public class Proyectil {

    private final long idRed;
    private final int dano;
    private final String idDueno;
    private final TipoArma arma;
    private final Vector2 velocidadPorTick;
    private final long tickExpiracion;

    private Vector2 posicion;

    public Proyectil(long idRed, Vector2 posicion, Vector2 velocidadPorTick, int dano, String idDueno,
                     TipoArma arma, long tickExpiracion) {
        this.idRed = idRed;
        this.posicion = posicion;
        this.velocidadPorTick = velocidadPorTick;
        this.dano = dano;
        this.idDueno = idDueno;
        this.arma = arma;
        this.tickExpiracion = tickExpiracion;
    }

    /** Punto final del segmento que recorre este tick. */
    public Vector2 destinoDelTick() {
        return posicion.sumar(velocidadPorTick);
    }

    public void avanzarA(Vector2 nuevaPosicion) {
        this.posicion = nuevaPosicion;
    }

    public boolean expiroEn(long tick) {
        return tick >= tickExpiracion;
    }

    /** Angulo de la trayectoria, para orientar el sprite en el cliente. */
    public double angulo() {
        return Math.atan2(velocidadPorTick.getY(), velocidadPorTick.getX());
    }
}
