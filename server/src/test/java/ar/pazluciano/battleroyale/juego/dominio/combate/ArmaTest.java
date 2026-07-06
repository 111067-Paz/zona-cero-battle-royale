package ar.pazluciano.battleroyale.juego.dominio.combate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Armas - Strategy determinista")
class ArmaTest {

    @Test
    @DisplayName("la pistola dispara un solo proyectil")
    void pistola_disparar_produceUnProyectil() {
        List<EspecificacionDisparo> disparos = new Pistola().disparar(0.0, new Random(1));

        assertEquals(1, disparos.size());
        assertEquals(TipoArma.PISTOLA, new Pistola().tipo());
    }

    @Test
    @DisplayName("la escopeta dispara varios perdigones")
    void escopeta_disparar_produceVariosPerdigones() {
        List<EspecificacionDisparo> disparos = new Escopeta().disparar(0.0, new Random(1));

        assertEquals(6, disparos.size());
    }

    @Test
    @DisplayName("con la misma semilla, la dispersion de la escopeta es identica (determinismo)")
    void escopeta_mismaSemilla_mismaDispersion() {
        List<EspecificacionDisparo> a = new Escopeta().disparar(0.0, new Random(7));
        List<EspecificacionDisparo> b = new Escopeta().disparar(0.0, new Random(7));

        for (int i = 0; i < a.size(); i++) {
            assertEquals(a.get(i).getAngulo(), b.get(i).getAngulo(), 1e-12);
        }
    }

    @Test
    @DisplayName("el rifle tiene mayor cadencia (menos ticks entre disparos) que la pistola")
    void rifle_cadencia_esMasRapidaQueLaPistola() {
        assertTrue(new Rifle().cadenciaTicks() < new Pistola().cadenciaTicks());
    }
}
