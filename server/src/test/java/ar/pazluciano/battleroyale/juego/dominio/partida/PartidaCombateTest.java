package ar.pazluciano.battleroyale.juego.dominio.partida;

import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("Partida - combate (Fase 2)")
class PartidaCombateTest {

    private static final double DT = 1.0 / 30.0;
    private static final double RADIO = 0.5;
    private static final double VELOCIDAD = 5.0;
    private static final int VIDA = 100;

    /** Mapa despejado con dos spawns enfrentados en la misma linea horizontal. */
    private MapaJuego mapa() {
        return new MapaJuego("t", 100.0, 100.0, List.of(),
                List.of(new Vector2(10.0, 50.0), new Vector2(16.0, 50.0)));
    }

    private ParametrosSimulacion params() {
        return ParametrosSimulacion.builder()
                .dt(DT).radioJugador(RADIO).velocidadJugador(VELOCIDAD).vidaInicial(VIDA).build();
    }

    private Partida partida() {
        return new Partida("p", mapa(), params(), 1L);
    }

    @Test
    @DisplayName("disparar engancha el cooldown y crea un proyectil; el cooldown baja tick a tick")
    void avanzarTick_disparar_enganchaCooldownYCreaProyectil() {
        Partida partida = partida();
        Jugador a = partida.agregarJugador("A");
        partida.aplicarInput("A", 1L, Vector2.CERO, 0.0, true);

        partida.avanzarTick();

        assertTrue(a.estaEnCooldown());
        assertTrue(partida.proyectilesVisibles().size() >= 1);
        int cooldown = a.getCooldownRestante();
        partida.avanzarTick();
        assertEquals(cooldown - 1, a.getCooldownRestante());
    }

    @Test
    @DisplayName("un jugador que dispara a otro lo mata y suma la baja")
    void avanzarTick_disparoSostenido_mataYSumaKill() {
        Partida partida = partida();
        Jugador a = partida.agregarJugador("A"); // (10,50)
        Jugador b = partida.agregarJugador("B"); // (16,50)
        partida.aplicarInput("A", 1L, Vector2.CERO, 0.0, true); // apunta a +x, hacia B

        for (int i = 0; i < 100; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoVida.MUERTO, b.getEstadoVida());
        assertEquals(1, a.getKills());
    }

    @Test
    @DisplayName("kill mutuo: ambos se disparan, ambos mueren y ambos suman una baja")
    void avanzarTick_killMutuo_ambosMuerenYSuman() {
        Partida partida = partida();
        Jugador a = partida.agregarJugador("A"); // (10,50)
        Jugador b = partida.agregarJugador("B"); // (16,50)
        partida.aplicarInput("A", 1L, Vector2.CERO, 0.0, true);       // A -> +x (a B)
        partida.aplicarInput("B", 1L, Vector2.CERO, Math.PI, true);   // B -> -x (a A)

        for (int i = 0; i < 120; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoVida.MUERTO, a.getEstadoVida());
        assertEquals(EstadoVida.MUERTO, b.getEstadoVida());
        assertEquals(1, a.getKills());
        assertEquals(1, b.getKills());
    }

    @Test
    @DisplayName("un jugador muerto no dispara aunque su intencion diga disparar")
    void avanzarTick_jugadorMuerto_noDispara() {
        Partida partida = partida();
        Jugador a = partida.agregarJugador("A");
        Jugador b = partida.agregarJugador("B");
        partida.aplicarInput("A", 1L, Vector2.CERO, 0.0, true);
        for (int i = 0; i < 100; i++) {
            partida.avanzarTick();
        }
        // B ya esta muerto; le pedimos que dispare y verificamos que no suma bajas
        partida.aplicarInput("B", 2L, Vector2.CERO, Math.PI, true);
        int killsDeBAntes = b.getKills();
        for (int i = 0; i < 60; i++) {
            partida.avanzarTick();
        }

        assertEquals(EstadoVida.MUERTO, b.getEstadoVida());
        assertEquals(killsDeBAntes, b.getKills());
    }
}
