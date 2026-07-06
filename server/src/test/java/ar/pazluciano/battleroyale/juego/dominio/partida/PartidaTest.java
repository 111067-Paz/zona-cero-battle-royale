package ar.pazluciano.battleroyale.juego.dominio.partida;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Partida - simulacion determinista de la Fase 0")
class PartidaTest {

    private static final double DT = 1.0 / 30.0;
    private static final int MUNDO = 256;
    private static final double RADIO = 0.5;
    private static final double VELOCIDAD = 5.0;
    private static final int VIDA = 100;
    private static final long SEMILLA = 42L;
    private static final String ID = "j-1";
    private static final double EPSILON = 1e-6;

    private Partida partida;

    @BeforeEach
    void crearPartida() {
        partida = new Partida("p-1", parametros(), SEMILLA);
    }

    private ParametrosSimulacion parametros() {
        return ParametrosSimulacion.builder()
                .dt(DT)
                .mundo(MUNDO)
                .radioJugador(RADIO)
                .velocidadJugador(VELOCIDAD)
                .vidaInicial(VIDA)
                .build();
    }

    @Test
    @DisplayName("avanzarTick mueve al jugador segun su intencion, velocidad y dt")
    void avanzarTick_conIntencionHaciaArriba_desplazaLaDistanciaEsperada() {
        Jugador jugador = partida.agregarJugador(ID);
        double xInicial = jugador.getPosicion().getX();
        double yInicial = jugador.getPosicion().getY();
        partida.aplicarInput(ID, 1L, new Vector2(0.0, -1.0), 0.0, false);

        partida.avanzarTick();

        assertEquals(xInicial, jugador.getPosicion().getX(), EPSILON);
        assertEquals(yInicial - VELOCIDAD * DT, jugador.getPosicion().getY(), EPSILON);
    }

    @Test
    @DisplayName("el jugador nunca atraviesa el borde del mundo (clamp a radio)")
    void avanzarTick_moviendoseAlBordeMuchoTiempo_quedaClampeadoEnElRadio() {
        partida.agregarJugador(ID);
        partida.aplicarInput(ID, 1L, new Vector2(-1.0, 0.0), 0.0, false);

        for (int i = 0; i < 2000; i++) {
            partida.avanzarTick();
        }

        double x = partida.buscarJugador(ID).orElseThrow().getPosicion().getX();
        assertEquals(RADIO, x, 1e-3);
    }

    @Test
    @DisplayName("dos inputs en el mismo tick: gana el de mayor sec (last-wins)")
    void aplicarInput_dosInputsSeguidos_prevaleceElUltimo() {
        Jugador jugador = partida.agregarJugador(ID);

        partida.aplicarInput(ID, 1L, new Vector2(1.0, 0.0), 0.0, false);
        partida.aplicarInput(ID, 2L, new Vector2(0.0, 1.0), 0.0, false);

        assertTrue(jugador.getIntencion().getMover().casiIgual(new Vector2(0.0, 1.0)));
        assertEquals(2L, jugador.getUltimaSec());
    }

    @Test
    @DisplayName("un input con sec menor o igual a la ultima se descarta en silencio")
    void aplicarInput_secVieja_seDescarta() {
        Jugador jugador = partida.agregarJugador(ID);
        partida.aplicarInput(ID, 5L, new Vector2(1.0, 0.0), 0.0, false);

        partida.aplicarInput(ID, 3L, new Vector2(0.0, 1.0), 0.0, false);

        assertTrue(jugador.getIntencion().getMover().casiIgual(new Vector2(1.0, 0.0)));
        assertEquals(5L, jugador.getUltimaSec());
    }

    @Test
    @DisplayName("misma semilla produce el mismo spawn (determinismo)")
    void agregarJugador_mismaSemilla_mismoSpawn() {
        Partida otra = new Partida("p-2", parametros(), SEMILLA);

        Jugador aca = partida.agregarJugador(ID);
        Jugador alla = otra.agregarJugador(ID);

        assertTrue(aca.getPosicion().casiIgual(alla.getPosicion()));
    }
}
