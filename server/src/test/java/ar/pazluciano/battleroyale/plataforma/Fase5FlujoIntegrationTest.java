package ar.pazluciano.battleroyale.plataforma;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Flujo completo de la Fase 5 contra el contexto Spring real (PLAN §10-F5, DoD): me registro,
 * hago login, pido el ticket de un solo uso y veo mis estadisticas — pasando por el filter chain
 * de Spring Security de verdad, no un mock. Complementa los unitarios: prueba que las piezas
 * ENCAJAN, no repite sus casos borde.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Tag("integration")
@DisplayName("Fase 5 - flujo end-to-end")
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class Fase5FlujoIntegrationTest {

    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;

    Fase5FlujoIntegrationTest(MockMvc mockMvc, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
    }

    @Test
    @DisplayName("registrar -> login -> pedir ticket -> ver mis estadisticas, de punta a punta")
    void flujoCompleto_registrarLoginTicketEstadisticas_funcionaDePuntaAPunta() throws Exception {
        // GIVEN: usuario unico para no chocar con otros tests que comparten la misma base H2.
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        String nombreUsuario = "e2e" + sufijo; // sin guion: el regex exige letra + [a-zA-Z0-9_]*
        String email = sufijo + "@e2e.test";

        // WHEN: registro
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"%s","email":"%s","password":"Password123"}
                                """.formatted(nombreUsuario, email)))
                .andExpect(status().isCreated());

        // WHEN: login con las credenciales recien creadas (prueba que quedaron persistidas de verdad)
        String bodyLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"%s","password":"Password123"}
                                """.formatted(nombreUsuario)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(bodyLogin).get("accessToken").asText();

        // WHEN + THEN: el ticket de un solo uso se emite para el usuario autenticado. La emision no
        // valida que la partida exista de verdad (eso lo hace el WS al canjear) — alcanza un id opaco.
        mockMvc.perform(post("/api/partidas/ticket")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("idPartida", "partida-e2e-test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket").isNotEmpty());

        // WHEN + THEN: mis estadisticas existen desde el registro (fila creada en 0), K/D sin muertes
        mockMvc.perform(get("/api/estadisticas/mias")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreUsuario").value(nombreUsuario))
                .andExpect(jsonPath("$.partidasJugadas").value(0));
    }

    @Test
    @DisplayName("un endpoint protegido sin token devuelve 401 (deny-by-default)")
    void endpointProtegido_sinToken_devuelve401() throws Exception {
        // WHEN + THEN
        mockMvc.perform(get("/api/estadisticas/mias"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("una ruta publica nunca devuelve 401, aunque el body sea invalido")
    void rutaPublica_sinToken_nuncaDevuelve401() throws Exception {
        // WHEN + THEN: 400 por Bean Validation, jamas 401 — /api/auth/** esta en permitAll
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
