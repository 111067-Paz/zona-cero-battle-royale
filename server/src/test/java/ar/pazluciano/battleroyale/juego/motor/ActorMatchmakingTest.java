package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJuego;
import ar.pazluciano.battleroyale.comun.config.ConfiguracionMatchmaking;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("ActorMatchmaking")
class ActorMatchmakingTest {

    private static final Long USUARIO_1 = 1L;
    private static final Long USUARIO_2 = 2L;
    private static final Long USUARIO_3 = 3L;
    private static final String ID_PARTIDA = "partida-xyz";

    @Mock
    private GestorPartidas gestorPartidas;
    @Mock
    private GameLoop gameLoop;

    private ActorMatchmaking actor;

    @BeforeEach
    void setUp() {
        ConfiguracionJuego configJuego = new ConfiguracionJuego();
        configJuego.setJugadoresPorPartida(3);
        ConfiguracionMatchmaking configMatchmaking = new ConfiguracionMatchmaking();
        configMatchmaking.setTimeoutSegundos(1);
        actor = new ActorMatchmaking(gestorPartidas, configJuego, configMatchmaking);
    }

    @AfterEach
    void apagarActor() {
        // El actor crea su propio executor en el constructor (no es un bean en este test unitario
        // puro: nadie dispara @PreDestroy) — lo apagamos a mano para no dejar hilos colgados.
        ReflectionTestUtils.invokeMethod(actor, "apagar");
    }

    @Test
    @DisplayName("un usuario recien encolado (sin llegar al cupo) queda esperando con su contador")
    void encolar_unUsuario_quedaEnColaConUnJugadorEncontrado() {
        // WHEN
        actor.encolar(USUARIO_1);

        // THEN
        EstadoCola estado = actor.consultarEstado(USUARIO_1);
        assertTrue(estado.isEnCola());
        assertEquals(1, estado.getJugadoresEncontrados());
        verify(gestorPartidas, never()).crearPartida(any());
    }

    @Test
    @DisplayName("al llegar al cupo configurado, completa el lote inmediatamente sin esperar el timeout")
    void encolar_llegaAlCupo_completaInmediatamenteYAsigna() {
        // GIVEN
        when(gestorPartidas.crearPartida(any())).thenReturn(gameLoop);
        when(gameLoop.getIdPartida()).thenReturn(ID_PARTIDA);

        // WHEN
        actor.encolar(USUARIO_1);
        actor.encolar(USUARIO_2);
        actor.encolar(USUARIO_3);

        // THEN
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(gestorPartidas).crearPartida(captor.capture());
        assertEquals(List.of(USUARIO_1, USUARIO_2, USUARIO_3), captor.getValue());

        EstadoCola estado = actor.consultarEstado(USUARIO_1);
        assertFalse(estado.isEnCola());
        assertEquals(ID_PARTIDA, estado.getIdPartida());
    }

    @Test
    @DisplayName("encolar dos veces al mismo usuario lanza UsuarioYaEnColaException (R6)")
    void encolar_usuarioYaEnCola_lanzaExcepcion() {
        // GIVEN
        actor.encolar(USUARIO_1);

        // WHEN + THEN
        assertThrows(UsuarioYaEnColaException.class, () -> actor.encolar(USUARIO_1));
    }

    @Test
    @DisplayName("encolar a un usuario con partida ya asignada (sin leerla aun) lanza excepcion")
    void encolar_usuarioYaAsignado_lanzaExcepcion() {
        // GIVEN: lote completo -> USUARIO_1 queda asignado sin haber consultado el estado todavia
        when(gestorPartidas.crearPartida(any())).thenReturn(gameLoop);
        when(gameLoop.getIdPartida()).thenReturn(ID_PARTIDA);
        actor.encolar(USUARIO_1);
        actor.encolar(USUARIO_2);
        actor.encolar(USUARIO_3);

        // WHEN + THEN
        assertThrows(UsuarioYaEnColaException.class, () -> actor.encolar(USUARIO_1));
    }

    @Test
    @DisplayName("un usuario que nunca se encolo consulta 'fuera de cola', sin enCola ni idPartida")
    void consultarEstado_usuarioNuncaEncolado_devuelveFueraDeCola() {
        // WHEN
        EstadoCola estado = actor.consultarEstado(USUARIO_1);

        // THEN
        assertFalse(estado.isEnCola());
        assertNull(estado.getJugadoresEncontrados());
        assertNull(estado.getIdPartida());
    }

    @Test
    @DisplayName("vencido el timeout sin llegar al cupo, completa el lote con lo que haya en cola")
    void encolar_timeoutVencido_completaElLoteIncompleto() throws InterruptedException {
        // GIVEN
        when(gestorPartidas.crearPartida(any())).thenReturn(gameLoop);
        when(gameLoop.getIdPartida()).thenReturn(ID_PARTIDA);

        // WHEN: solo 1 de los 3 del cupo — el timeout (1s configurado) tiene que completarlo solo
        actor.encolar(USUARIO_1);
        EstadoCola estadoInmediato = actor.consultarEstado(USUARIO_1);
        assertTrue(estadoInmediato.isEnCola());

        esperarHasta(() -> actor.consultarEstado(USUARIO_1).getIdPartida() != null, 3_000);

        // THEN
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(gestorPartidas).crearPartida(captor.capture());
        assertEquals(List.of(USUARIO_1), captor.getValue());
    }

    private void esperarHasta(java.util.function.BooleanSupplier condicion, long timeoutMillis)
            throws InterruptedException {
        long limite = System.currentTimeMillis() + timeoutMillis;
        while (!condicion.getAsBoolean()) {
            if (System.currentTimeMillis() > limite) {
                throw new AssertionError("La condicion no se cumplio dentro de " + timeoutMillis + "ms");
            }
            Thread.sleep(50);
        }
    }
}
