package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.services.EstadisticaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("EstadisticaController")
class EstadisticaControllerTest {

    private static final Long ID_USUARIO = 7L;

    @Mock
    private EstadisticaService estadisticaService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        EstadisticaController controller = new EstadisticaController(estadisticaService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("GET /api/estadisticas/mias devuelve las estadisticas del usuario autenticado")
    void misEstadisticas_usuarioAutenticado_devuelve200() throws Exception {
        // GIVEN
        when(estadisticaService.misEstadisticas(ID_USUARIO))
                .thenReturn(EstadisticaDTO.builder().nombreUsuario("jugador7").victorias(3).build());

        // WHEN + THEN
        mockMvc.perform(get("/api/estadisticas/mias")
                        .principal(new UsernamePasswordAuthenticationToken(ID_USUARIO, null, List.of())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreUsuario").value("jugador7"))
                .andExpect(jsonPath("$.victorias").value(3));
    }

    @Test
    @DisplayName("GET /api/estadisticas/ranking devuelve la pagina de estadisticas")
    void ranking_devuelve200ConPaginaJson() throws Exception {
        // GIVEN
        EstadisticaDTO primero = EstadisticaDTO.builder().nombreUsuario("top1").victorias(50).build();
        when(estadisticaService.ranking(any()))
                .thenReturn(new PageImpl<>(List.of(primero), PageRequest.of(0, 10), 1));

        // WHEN + THEN
        mockMvc.perform(get("/api/estadisticas/ranking").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nombreUsuario").value("top1"));
    }
}
