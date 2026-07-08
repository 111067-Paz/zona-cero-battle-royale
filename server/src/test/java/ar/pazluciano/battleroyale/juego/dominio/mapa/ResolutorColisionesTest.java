package ar.pazluciano.battleroyale.juego.dominio.mapa;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("ResolutorColisiones - circulo vs AABB con deslizamiento")
class ResolutorColisionesTest {

    private static final double RADIO = 0.5;
    private static final double EPSILON = 1e-6;

    private final ResolutorColisiones resolutor = new ResolutorColisiones();

    /** Mapa 100x100 con UN obstaculo que ocupa [40,60] x [40,60]. */
    private MapaJuego mapaConObstaculoCentral() {
        return new MapaJuego("t", 100.0, 100.0,
                List.of(new ObstaculoAABB(40.0, 40.0, 20.0, 20.0)),
                List.of(new Vector2(10.0, 10.0)), List.of());
    }

    @Test
    @DisplayName("penetrando por la izquierda, expulsa a x = borde - radio")
    void resolver_penetraDesdeIzquierda_expulsaHaciaAfuera() {
        Vector2 resultado = resolutor.resolver(new Vector2(39.8, 50.0), RADIO, mapaConObstaculoCentral());

        assertTrue(resultado.casiIgual(new Vector2(39.5, 50.0)));
    }

    @Test
    @DisplayName("penetrando por la derecha, expulsa a x = borde + radio")
    void resolver_penetraDesdeDerecha_expulsaHaciaAfuera() {
        Vector2 resultado = resolutor.resolver(new Vector2(60.2, 50.0), RADIO, mapaConObstaculoCentral());

        assertTrue(resultado.casiIgual(new Vector2(60.5, 50.0)));
    }

    @Test
    @DisplayName("penetrando por arriba, expulsa a y = borde - radio")
    void resolver_penetraDesdeArriba_expulsaHaciaAfuera() {
        Vector2 resultado = resolutor.resolver(new Vector2(50.0, 39.8), RADIO, mapaConObstaculoCentral());

        assertTrue(resultado.casiIgual(new Vector2(50.0, 39.5)));
    }

    @Test
    @DisplayName("sin contacto, la posicion no se toca")
    void resolver_sinContacto_dejaLaPosicionIgual() {
        Vector2 deseada = new Vector2(10.0, 10.0);

        Vector2 resultado = resolutor.resolver(deseada, RADIO, mapaConObstaculoCentral());

        assertTrue(resultado.casiIgual(deseada));
    }

    @Test
    @DisplayName("con el centro DENTRO del obstaculo, expulsa por el eje de menor penetracion")
    void resolver_centroDentro_expulsaPorMenorPenetracion() {
        // (45,50): mas cerca del borde izquierdo (5) que del resto -> sale por izquierda
        Vector2 resultado = resolutor.resolver(new Vector2(45.0, 50.0), RADIO, mapaConObstaculoCentral());

        assertTrue(resultado.casiIgual(new Vector2(39.5, 50.0)));
    }

    @Test
    @DisplayName("rozando una esquina, el circulo la rodea quedando a distancia radio del vertice")
    void resolver_esquina_ruedaAlrededorDelVertice() {
        Vector2 resultado = resolutor.resolver(new Vector2(39.7, 39.7), RADIO, mapaConObstaculoCentral());

        double distanciaAlVertice = Math.hypot(resultado.getX() - 40.0, resultado.getY() - 40.0);
        assertEquals(RADIO, distanciaAlVertice, EPSILON);
    }

    @Test
    @DisplayName("deslizamiento: corrige solo la componente normal, conserva la tangencial")
    void resolver_entrandoEnDiagonal_deslizaPorLaPared() {
        // Penetra la cara izquierda (x) pero tambien baja (y): la y se conserva, la x se corrige.
        Vector2 resultado = resolutor.resolver(new Vector2(39.8, 55.0), RADIO, mapaConObstaculoCentral());

        assertTrue(resultado.casiIgual(new Vector2(39.5, 55.0)));
    }

    @Test
    @DisplayName("clampa al borde del mapa (radio de margen)")
    void resolver_fueraDelBorde_clampeaAlRadio() {
        Vector2 resultado = resolutor.resolver(new Vector2(0.2, 50.0), RADIO, mapaConObstaculoCentral());

        assertEquals(RADIO, resultado.getX(), EPSILON);
        assertEquals(50.0, resultado.getY(), EPSILON);
    }
}
