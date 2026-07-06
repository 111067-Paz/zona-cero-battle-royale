package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Partida - simulacion determinista")
class PartidaTest {

    private static final double DT = 1.0 / 30.0;
    private static final double RADIO = 0.5;
    private static final double VELOCIDAD = 5.0;
    private static final int VIDA = 100;
    private static final long SEMILLA = 42L;
    private static final String ID = "j-1";
    private static final double EPSILON = 1e-6;

    private static final Vector2 SPAWN_0 = new Vector2(128.0, 128.0);
    private static final Vector2 SPAWN_1 = new Vector2(64.0, 64.0);

    private Partida partida;

    @BeforeEach
    void crearPartida() {
        partida = new Partida("p-1", mapaSinObstaculos(), parametros(), SEMILLA);
    }

    /** Mapa 256x256 sin obstaculos, con dos spawns conocidos para asertar posiciones. */
    private MapaJuego mapaSinObstaculos() {
        return new MapaJuego("test", 256.0, 256.0, List.of(), List.of(SPAWN_0, SPAWN_1));
    }

    private ParametrosSimulacion parametros() {
        return ParametrosSimulacion.builder()
                .dt(DT)
                .radioJugador(RADIO)
                .velocidadJugador(VELOCIDAD)
                .vidaInicial(VIDA)
                .build();
    }

    @Test
    @DisplayName("el jugador nace en el spawn del mapa segun su orden de union")
    void agregarJugador_asignaSpawnDelMapaPorOrden() {
        Jugador primero = partida.agregarJugador("a");
        Jugador segundo = partida.agregarJugador("b");

        assertTrue(primero.getPosicion().casiIgual(SPAWN_0));
        assertTrue(segundo.getPosicion().casiIgual(SPAWN_1));
    }

    @Test
    @DisplayName("avanzarTick mueve al jugador segun su intencion, velocidad y dt")
    void avanzarTick_conIntencionHaciaArriba_desplazaLaDistanciaEsperada() {
        Jugador jugador = partida.agregarJugador(ID);
        partida.aplicarInput(ID, 1L, new Vector2(0.0, -1.0), 0.0, false);

        partida.avanzarTick();

        assertEquals(SPAWN_0.getX(), jugador.getPosicion().getX(), EPSILON);
        assertEquals(SPAWN_0.getY() - VELOCIDAD * DT, jugador.getPosicion().getY(), EPSILON);
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
}
