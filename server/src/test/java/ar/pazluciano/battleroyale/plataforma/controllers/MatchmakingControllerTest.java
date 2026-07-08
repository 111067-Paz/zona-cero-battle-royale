package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.comun.errores.GlobalExceptionHandler;
import ar.pazluciano.battleroyale.juego.motor.ActorMatchmaking;
import ar.pazluciano.battleroyale.juego.motor.EstadoCola;
import ar.pazluciano.battleroyale.juego.motor.UsuarioYaEnColaException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("MatchmakingController")
class MatchmakingControllerTest {

    private static final Long ID_USUARIO = 7L;

    @Mock
    private ActorMatchmaking actorMatchmaking;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MatchmakingController controller = new MatchmakingController(actorMatchmaking);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(ID_USUARIO, null, List.of()));
    }

    @AfterEach
    void limpiarContextoDeSeguridad() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("POST /api/matchmaking/cola con usuario autenticado devuelve 200")
    void encolar_usuarioAutenticado_devuelve200() throws Exception {
        // WHEN + THEN
        mockMvc.perform(post("/api/matchmaking/cola"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/matchmaking/cola con usuario ya en cola devuelve 409")
    void encolar_usuarioYaEnCola_devuelve409() throws Exception {
        // GIVEN
        doThrow(new UsuarioYaEnColaException("Ya estas en cola")).when(actorMatchmaking).encolar(ID_USUARIO);

        // WHEN + THEN
        mockMvc.perform(post("/api/matchmaking/cola"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Ya estas en cola"));
    }

    @Test
    @DisplayName("GET /api/matchmaking/estado mientras espera devuelve enCola y jugadoresEncontrados")
    void estado_enCola_devuelveJugadoresEncontrados() throws Exception {
        // GIVEN
        when(actorMatchmaking.consultarEstado(ID_USUARIO)).thenReturn(EstadoCola.enCola(3));

        // WHEN + THEN
        mockMvc.perform(get("/api/matchmaking/estado"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enCola").value(true))
                .andExpect(jsonPath("$.jugadoresEncontrados").value(3))
                .andExpect(jsonPath("$.idPartida").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/matchmaking/estado ya asignado devuelve idPartida")
    void estado_asignado_devuelveIdPartida() throws Exception {
        // GIVEN
        when(actorMatchmaking.consultarEstado(ID_USUARIO)).thenReturn(EstadoCola.asignada("partida-xyz"));

        // WHEN + THEN
        mockMvc.perform(get("/api/matchmaking/estado"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enCola").value(false))
                .andExpect(jsonPath("$.idPartida").value("partida-xyz"));
    }
}
