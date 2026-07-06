package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vector 2D en el wire (campo {@code mover} del {@link Input}). Es dato puro: la logica vectorial
 * (normalizar, escalar) vive en el {@code Vector2} del dominio, no aca. Separarlos mantiene la
 * frontera entre el contrato de red y la simulacion.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VectorMensaje {

    private double x;
    private double y;
}
