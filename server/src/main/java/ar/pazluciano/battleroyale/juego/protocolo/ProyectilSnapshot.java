package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista por VALOR de un proyectil en un {@link Snapshot} (PLAN §5.2). El {@code id} es el
 * {@code idRed}, monotonico y JAMAS reciclado (R2): el cliente lo usa para no interpolar una bala
 * nueva desde la posicion de una vieja.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProyectilSnapshot {

    private long id;
    private double x;
    private double y;
    private double angulo;
}
