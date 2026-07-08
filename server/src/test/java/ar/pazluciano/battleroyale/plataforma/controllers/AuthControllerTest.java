package ar.pazluciano.battleroyale.plataforma.controllers;

import ar.pazluciano.battleroyale.comun.errores.GlobalExceptionHandler;
import ar.pazluciano.battleroyale.plataforma.dtos.AuthResponse;
import ar.pazluciano.battleroyale.plataforma.dtos.LoginRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RefreshRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RegisterRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;
import ar.pazluciano.battleroyale.plataforma.exceptions.CredencialesInvalidasException;
import ar.pazluciano.battleroyale.plataforma.exceptions.TokenInvalidoException;
import ar.pazluciano.battleroyale.plataforma.exceptions.UsuarioYaExisteException;
import ar.pazluciano.battleroyale.plataforma.services.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("AuthController")
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(authService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(new LocalValidatorFactoryBean())
                .build();
    }

    @Test
    @DisplayName("POST /api/auth/register con datos validos devuelve 201 con los tokens")
    void register_datosValidos_devuelve201ConTokens() throws Exception {
        // GIVEN
        when(authService.register(org.mockito.ArgumentMatchers.any(RegisterRequest.class)))
                .thenReturn(authResponse());

        // WHEN + THEN
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"jugador1","email":"jugador1@test.com","password":"Password123"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.usuario.nombreUsuario").value("jugador1"));
    }

    @Test
    @DisplayName("POST /api/auth/register con usuario ya existente devuelve 409")
    void register_usuarioYaExiste_devuelve409() throws Exception {
        // GIVEN
        when(authService.register(org.mockito.ArgumentMatchers.any(RegisterRequest.class)))
                .thenThrow(new UsuarioYaExisteException("El nombre de usuario ya esta en uso"));

        // WHEN + THEN
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"jugador1","email":"jugador1@test.com","password":"Password123"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("El nombre de usuario ya esta en uso"));
    }

    @Test
    @DisplayName("POST /api/auth/register con nombre de usuario vacio devuelve 400 (Bean Validation)")
    void register_datosInvalidos_devuelve400() throws Exception {
        // WHEN + THEN
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"","email":"jugador1@test.com","password":"Password123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/login con credenciales validas devuelve 200")
    void login_credencialesValidas_devuelve200() throws Exception {
        // GIVEN
        when(authService.login(org.mockito.ArgumentMatchers.any(LoginRequest.class)))
                .thenReturn(authResponse());

        // WHEN + THEN
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"jugador1","password":"Password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"));
    }

    @Test
    @DisplayName("POST /api/auth/login con credenciales invalidas devuelve 401")
    void login_credencialesInvalidas_devuelve401() throws Exception {
        // GIVEN
        when(authService.login(org.mockito.ArgumentMatchers.any(LoginRequest.class)))
                .thenThrow(new CredencialesInvalidasException("Usuario o contrasenia incorrectos"));

        // WHEN + THEN
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombreUsuario":"jugador1","password":"incorrecta"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/refresh con token valido devuelve 200")
    void refresh_tokenValido_devuelve200() throws Exception {
        // GIVEN
        when(authService.refresh(org.mockito.ArgumentMatchers.any(RefreshRequest.class)))
                .thenReturn(authResponse());

        // WHEN + THEN
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"un-refresh-token-cualquiera"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/auth/refresh con token invalido devuelve 401")
    void refresh_tokenInvalido_devuelve401() throws Exception {
        // GIVEN
        when(authService.refresh(org.mockito.ArgumentMatchers.any(RefreshRequest.class)))
                .thenThrow(new TokenInvalidoException("Refresh token invalido"));

        // WHEN + THEN
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"token-invalido"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    private AuthResponse authResponse() {
        return AuthResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .expiraEnSegundos(900L)
                .usuario(UsuarioDTO.builder().id(1L).nombreUsuario("jugador1").email("jugador1@test.com").build())
                .build();
    }
}
