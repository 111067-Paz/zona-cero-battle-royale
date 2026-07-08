package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.dominio.participante.Comportamiento;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("ComportamientoFsm - FSM del bot")
class ComportamientoFsmTest {

    private Jugador botEn(double x, double y) {
        return new Jugador("bot", 0, new Vector2(x, y), 100);
    }

    private Comportamiento comportamientoMedio() {
        return new FabricaExplorador().crearComportamiento();
    }

    @Test
    @DisplayName("sin rival a la vista, merodea (se mueve y no dispara)")
    void pensar_sinRival_merodeaSinDisparar() {
        Jugador bot = botEn(50.0, 50.0);
        Comportamiento comportamiento = comportamientoMedio();
        MundoFalso mundo = new MundoFalso(List.of(), true);

        comportamiento.pensar(bot, mundo, new Random(1));

        assertFalse(bot.getIntencion().isDisparar());
        assertTrue(bot.getIntencion().getMover().longitud() > 0.5);
    }

    @Test
    @DisplayName("con un rival a la vista y en rango, termina atacando (dispara)")
    void pensar_rivalEnRango_terminaDisparando() {
        Jugador bot = botEn(0.0, 0.0);
        Jugador rival = new Jugador("r", 1, new Vector2(5.0, 0.0), 100);
        Comportamiento comportamiento = comportamientoMedio();
        MundoFalso mundo = new MundoFalso(List.of(rival), true);
        Random rng = new Random(1);

        for (int i = 0; i < 20; i++) {
            comportamiento.pensar(bot, mundo, rng);
        }

        assertTrue(bot.getIntencion().isDisparar());
    }

    @Test
    @DisplayName("con un rival a la vista pero SIN linea de vista, no lo ataca (no dispara)")
    void pensar_rivalSinLineaDeVista_noDispara() {
        Jugador bot = botEn(0.0, 0.0);
        Jugador rival = new Jugador("r", 1, new Vector2(5.0, 0.0), 100);
        Comportamiento comportamiento = comportamientoMedio();
        MundoFalso mundo = new MundoFalso(List.of(rival), false);
        Random rng = new Random(1);

        for (int i = 0; i < 20; i++) {
            comportamiento.pensar(bot, mundo, rng);
        }

        assertFalse(bot.getIntencion().isDisparar());
    }

    @Test
    @DisplayName("mismo seed produce el mismo merodeo (determinismo)")
    void pensar_mismaSemilla_mismoMerodeo() {
        Jugador botA = botEn(50.0, 50.0);
        Jugador botB = botEn(50.0, 50.0);
        Comportamiento a = comportamientoMedio();
        Comportamiento b = comportamientoMedio();
        MundoFalso mundo = new MundoFalso(List.of(), true);
        Random rngA = new Random(7);
        Random rngB = new Random(7);

        for (int i = 0; i < 10; i++) {
            a.pensar(botA, mundo, rngA);
            b.pensar(botB, mundo, rngB);
        }

        assertTrue(botA.getIntencion().getMover().casiIgual(botB.getIntencion().getMover()));
    }
}
