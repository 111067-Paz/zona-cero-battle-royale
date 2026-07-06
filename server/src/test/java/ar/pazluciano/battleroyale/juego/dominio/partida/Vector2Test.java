package ar.pazluciano.battleroyale.juego.dominio.partida;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Vector2 - value object de fisica")
class Vector2Test {

    private static final double EPSILON = 1e-9;

    @Test
    @DisplayName("normalizado de (3,4) devuelve un vector unitario en la misma direccion")
    void normalizado_vectorNoNulo_devuelveUnitario() {
        Vector2 vector = new Vector2(3.0, 4.0);

        Vector2 unitario = vector.normalizado();

        assertEquals(1.0, unitario.longitud(), EPSILON);
        assertEquals(0.6, unitario.getX(), EPSILON);
        assertEquals(0.8, unitario.getY(), EPSILON);
    }

    @Test
    @DisplayName("normalizado del vector nulo devuelve CERO sin dividir por cero")
    void normalizado_vectorNulo_devuelveCero() {
        Vector2 unitario = Vector2.CERO.normalizado();

        assertTrue(unitario.casiIgual(Vector2.CERO));
    }

    @Test
    @DisplayName("conLongitudMaxima recorta un vector largo conservando la direccion (anti speed-hack)")
    void conLongitudMaxima_vectorLargo_seRecortaAlMaximo() {
        Vector2 vector = new Vector2(3.0, 4.0); // longitud 5

        Vector2 recortado = vector.conLongitudMaxima(1.0);

        assertEquals(1.0, recortado.longitud(), EPSILON);
        assertTrue(recortado.casiIgual(new Vector2(0.6, 0.8)));
    }

    @Test
    @DisplayName("conLongitudMaxima deja intacto un vector mas corto que el maximo")
    void conLongitudMaxima_vectorCorto_quedaIgual() {
        Vector2 vector = new Vector2(0.1, 0.0);

        Vector2 resultado = vector.conLongitudMaxima(1.0);

        assertTrue(resultado.casiIgual(vector));
    }
}
