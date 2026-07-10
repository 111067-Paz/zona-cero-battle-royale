package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.juego.dominio.mapa.MapaJuego;
import ar.pazluciano.battleroyale.juego.dominio.partida.Partida;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosCiclo;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosSimulacion;
import ar.pazluciano.battleroyale.juego.dominio.partida.ParametrosZona;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;
import ar.pazluciano.battleroyale.juego.protocolo.JugadorSnapshot;
import ar.pazluciano.battleroyale.juego.protocolo.Snapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("unit")
@DisplayName("EnsambladorSnapshot - registro de personaje (PLAN §15)")
class EnsambladorSnapshotTest {

    private static final String ID_JUGADOR = "j-1";
    private static final long SEMILLA = 1L;

    private Partida partida;
    private EnsambladorSnapshot ensamblador;

    @BeforeEach
    void setUp() {
        MapaJuego mapa = new MapaJuego("test", 256.0, 256.0, List.of(), List.of(new Vector2(10, 10)), List.of());
        ParametrosSimulacion parametros = ParametrosSimulacion.builder()
                .dt(1.0 / 30).radioJugador(0.5).velocidadJugador(5.0).vidaInicial(100).build();
        ParametrosCiclo ciclo = ParametrosCiclo.builder()
                .lobbyTimeoutTicks(1).cuentaRegresivaTicks(1).graciaFinTicks(1).build();
        ParametrosZona zona = ParametrosZona.builder()
                .radioInicial(10_000.0).radioMinimo(10_000.0).cantidadFases(0)
                .ticksContraccion(1).ticksEspera(999_999).danioPorSegundo(0.0).build();
        partida = new Partida("p-1", mapa, parametros, ciclo, zona, SEMILLA);
        partida.agregarJugador(ID_JUGADOR);
        ensamblador = new EnsambladorSnapshot();
    }

    @Test
    @DisplayName("un jugador registrado aparece en el snapshot con su personaje")
    void desde_jugadorRegistrado_emiteSuPersonaje() {
        // GIVEN
        ensamblador.registrarPersonaje(ID_JUGADOR, Personaje.DINO);

        // WHEN
        Snapshot snapshot = ensamblador.desde(partida);

        // THEN
        assertEquals(Personaje.DINO, jugadorUnico(snapshot).getPersonaje());
    }

    @Test
    @DisplayName("un jugador nunca registrado emite el personaje por defecto (GATO)")
    void desde_jugadorNuncaRegistrado_emitePersonajePorDefecto() {
        // WHEN: sin llamar registrarPersonaje
        Snapshot snapshot = ensamblador.desde(partida);

        // THEN
        assertEquals(Personaje.GATO, jugadorUnico(snapshot).getPersonaje());
    }

    @Test
    @DisplayName("quitarPersonaje libera el registro: vuelve a emitir el default")
    void quitarPersonaje_trasRegistrar_vuelveAlDefault() {
        // GIVEN
        ensamblador.registrarPersonaje(ID_JUGADOR, Personaje.CONEJO);

        // WHEN
        ensamblador.quitarPersonaje(ID_JUGADOR);
        Snapshot snapshot = ensamblador.desde(partida);

        // THEN
        assertEquals(Personaje.GATO, jugadorUnico(snapshot).getPersonaje());
    }

    @Test
    @DisplayName("registrar dos veces al mismo jugador reemplaza el personaje, no lo apila")
    void registrarPersonaje_dosVeces_reemplazaElValorAnterior() {
        // GIVEN
        ensamblador.registrarPersonaje(ID_JUGADOR, Personaje.ARDILLA);

        // WHEN
        ensamblador.registrarPersonaje(ID_JUGADOR, Personaje.ROBO_PERRO);
        Snapshot snapshot = ensamblador.desde(partida);

        // THEN
        assertEquals(Personaje.ROBO_PERRO, jugadorUnico(snapshot).getPersonaje());
    }

    private JugadorSnapshot jugadorUnico(Snapshot snapshot) {
        assertEquals(1, snapshot.getJugadores().size());
        return snapshot.getJugadores().get(0);
    }
}
