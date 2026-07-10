package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.comun.tickets.TicketService;
import ar.pazluciano.battleroyale.plataforma.services.PerfilService;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("TicketController")
class TicketControllerTest {

    private static final Long ID_USUARIO = 7L;
    private static final String ID_PARTIDA = "partida-abc";

    @Mock
    private TicketService ticketService;
    @Mock
    private PerfilService perfilService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        TicketController controller = new TicketController(ticketService, perfilService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
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
    @DisplayName("POST /api/partidas/ticket con usuario autenticado devuelve 200 con el ticket")
    void crearTicket_usuarioAutenticado_devuelve200ConTicket() throws Exception {
        // GIVEN
        when(perfilService.personajeDe(ID_USUARIO)).thenReturn(Personaje.GATO);
        when(ticketService.crear(ID_USUARIO, ID_PARTIDA, Personaje.GATO)).thenReturn("ticket-generado");

        // WHEN + THEN
        mockMvc.perform(post("/api/partidas/ticket").param("idPartida", ID_PARTIDA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket").value("ticket-generado"));
    }
}
