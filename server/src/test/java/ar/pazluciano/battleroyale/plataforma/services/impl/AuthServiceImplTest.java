package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJwt;
import ar.pazluciano.battleroyale.plataforma.dtos.AuthResponse;
import ar.pazluciano.battleroyale.plataforma.dtos.LoginRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RefreshRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RegisterRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;
import ar.pazluciano.battleroyale.plataforma.entities.TokenRefresco;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.exceptions.CredencialesInvalidasException;
import ar.pazluciano.battleroyale.plataforma.exceptions.TokenInvalidoException;
import ar.pazluciano.battleroyale.plataforma.exceptions.UsuarioYaExisteException;
import ar.pazluciano.battleroyale.plataforma.mappers.UsuarioMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.EstadisticaJugadorRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.TokenRefrescoRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import ar.pazluciano.battleroyale.plataforma.services.JwtTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("AuthServiceImpl")
class AuthServiceImplTest {

    private static final String NOMBRE_USUARIO = "jugador1";
    private static final String EMAIL = "jugador1@test.com";
    private static final String PASSWORD = "Password123";
    private static final String PASSWORD_HASH = "hash-bcrypt";
    private static final Long ID_USUARIO = 1L;

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EstadisticaJugadorRepository estadisticaJugadorRepository;
    @Mock
    private TokenRefrescoRepository tokenRefrescoRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private UsuarioMapper usuarioMapper;
    @Mock
    private LimitadorIntentosLogin limitador;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        ConfiguracionJwt configuracionJwt = new ConfiguracionJwt();
        configuracionJwt.setAccessMinutos(15);
        configuracionJwt.setRefreshDias(30);
        authService = new AuthServiceImpl(usuarioRepository, estadisticaJugadorRepository,
                tokenRefrescoRepository, passwordEncoder, jwtTokenService, usuarioMapper, limitador,
                configuracionJwt);
    }

    // ---------- register ----------

    @Test
    @DisplayName("register con nombre de usuario ya en uso lanza UsuarioYaExisteException")
    void register_nombreUsuarioYaExiste_lanzaExcepcion() {
        // GIVEN
        when(usuarioRepository.existsByNombreUsuario(NOMBRE_USUARIO)).thenReturn(true);
        RegisterRequest request = registerRequest();

        // WHEN + THEN
        UsuarioYaExisteException excepcion =
                assertThrows(UsuarioYaExisteException.class, () -> authService.register(request));
        assertEquals("El nombre de usuario ya esta en uso", excepcion.getMessage());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("register con email ya registrado lanza UsuarioYaExisteException")
    void register_emailYaExiste_lanzaExcepcion() {
        // GIVEN
        when(usuarioRepository.existsByNombreUsuario(NOMBRE_USUARIO)).thenReturn(false);
        when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(true);
        RegisterRequest request = registerRequest();

        // WHEN + THEN
        UsuarioYaExisteException excepcion =
                assertThrows(UsuarioYaExisteException.class, () -> authService.register(request));
        assertEquals("El email ya esta registrado", excepcion.getMessage());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("register con datos validos crea Usuario + EstadisticaJugador y emite tokens")
    void register_datosValidos_creaUsuarioEstadisticaYEmiteTokens() {
        // GIVEN
        when(usuarioRepository.existsByNombreUsuario(NOMBRE_USUARIO)).thenReturn(false);
        when(usuarioRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(PASSWORD)).thenReturn(PASSWORD_HASH);
        Usuario usuarioGuardado = usuarioConId();
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioGuardado);
        when(jwtTokenService.generarAccessToken(usuarioGuardado)).thenReturn("access-token");
        when(usuarioMapper.toDTO(usuarioGuardado)).thenReturn(usuarioDTO());
        RegisterRequest request = registerRequest();

        // WHEN
        AuthResponse respuesta = authService.register(request);

        // THEN
        verify(estadisticaJugadorRepository).save(any());
        ArgumentCaptor<TokenRefresco> captor = ArgumentCaptor.forClass(TokenRefresco.class);
        verify(tokenRefrescoRepository).save(captor.capture());
        assertEquals(usuarioGuardado, captor.getValue().getUsuario());
        assertEquals("access-token", respuesta.getAccessToken());
        assertNotNull(respuesta.getRefreshToken());
        assertEquals(15 * 60L, respuesta.getExpiraEnSegundos());
        assertEquals(ID_USUARIO, respuesta.getUsuario().getId());
    }

    // ---------- login ----------

    @Test
    @DisplayName("login con usuario inexistente registra intento fallido y lanza CredencialesInvalidas")
    void login_usuarioNoExiste_lanzaCredencialesInvalidasYRegistraIntentoFallido() {
        // GIVEN
        when(usuarioRepository.findByNombreUsuario(NOMBRE_USUARIO)).thenReturn(Optional.empty());
        LoginRequest request = loginRequest();

        // WHEN + THEN
        assertThrows(CredencialesInvalidasException.class, () -> authService.login(request));
        verify(limitador).registrarIntentoFallido(NOMBRE_USUARIO);
        verify(limitador, never()).limpiar(anyString());
    }

    @Test
    @DisplayName("login con password incorrecta registra intento fallido y lanza CredencialesInvalidas")
    void login_passwordIncorrecta_lanzaCredencialesInvalidas() {
        // GIVEN
        Usuario usuario = usuarioConId();
        when(usuarioRepository.findByNombreUsuario(NOMBRE_USUARIO)).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches(PASSWORD, usuario.getPasswordHash())).thenReturn(false);
        LoginRequest request = loginRequest();

        // WHEN + THEN
        assertThrows(CredencialesInvalidasException.class, () -> authService.login(request));
        verify(limitador).registrarIntentoFallido(NOMBRE_USUARIO);
    }

    @Test
    @DisplayName("login con credenciales validas limpia el limitador y emite tokens")
    void login_credencialesValidas_limpiaLimitadorYEmiteTokens() {
        // GIVEN
        Usuario usuario = usuarioConId();
        when(usuarioRepository.findByNombreUsuario(NOMBRE_USUARIO)).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches(PASSWORD, usuario.getPasswordHash())).thenReturn(true);
        when(jwtTokenService.generarAccessToken(usuario)).thenReturn("access-token");
        when(usuarioMapper.toDTO(usuario)).thenReturn(usuarioDTO());
        LoginRequest request = loginRequest();

        // WHEN
        AuthResponse respuesta = authService.login(request);

        // THEN
        verify(limitador).limpiar(NOMBRE_USUARIO);
        verify(limitador, never()).registrarIntentoFallido(anyString());
        assertEquals("access-token", respuesta.getAccessToken());
    }

    // ---------- refresh ----------

    @Test
    @DisplayName("refresh con token no encontrado lanza TokenInvalidoException")
    void refresh_tokenNoEncontrado_lanzaTokenInvalido() {
        // GIVEN
        when(tokenRefrescoRepository.findByHashToken(anyString())).thenReturn(Optional.empty());
        RefreshRequest request = new RefreshRequest("token-plano-cualquiera");

        // WHEN + THEN
        assertThrows(TokenInvalidoException.class, () -> authService.refresh(request));
    }

    @Test
    @DisplayName("refresh con token ya revocado (reuso) revoca TODA la familia y lanza TokenInvalido")
    void refresh_tokenRevocado_revocaFamiliaYLanzaTokenInvalido() {
        // GIVEN
        UUID familia = UUID.randomUUID();
        TokenRefresco tokenGuardado = new TokenRefresco(usuarioConId(), "hash", familia,
                LocalDateTime.now().plusDays(1));
        tokenGuardado.setRevocado(true);
        when(tokenRefrescoRepository.findByHashToken(anyString())).thenReturn(Optional.of(tokenGuardado));
        RefreshRequest request = new RefreshRequest("token-plano-reusado");

        // WHEN + THEN
        assertThrows(TokenInvalidoException.class, () -> authService.refresh(request));
        verify(tokenRefrescoRepository).revocarFamilia(familia);
        verify(tokenRefrescoRepository, never()).save(any());
    }

    @Test
    @DisplayName("refresh con token expirado lanza TokenInvalidoException")
    void refresh_tokenExpirado_lanzaTokenInvalido() {
        // GIVEN
        TokenRefresco tokenGuardado = new TokenRefresco(usuarioConId(), "hash", UUID.randomUUID(),
                LocalDateTime.now().minusMinutes(1));
        when(tokenRefrescoRepository.findByHashToken(anyString())).thenReturn(Optional.of(tokenGuardado));
        RefreshRequest request = new RefreshRequest("token-plano-vencido");

        // WHEN + THEN
        assertThrows(TokenInvalidoException.class, () -> authService.refresh(request));
        verify(tokenRefrescoRepository, never()).revocarFamilia(any());
    }

    @Test
    @DisplayName("refresh con token valido rota el token (queda revocado) y emite un par nuevo con la misma familia")
    void refresh_tokenValido_rotaYEmiteTokensConMismaFamilia() {
        // GIVEN
        UUID familia = UUID.randomUUID();
        Usuario usuario = usuarioConId();
        TokenRefresco tokenGuardado =
                new TokenRefresco(usuario, "hash", familia, LocalDateTime.now().plusDays(1));
        when(tokenRefrescoRepository.findByHashToken(anyString())).thenReturn(Optional.of(tokenGuardado));
        when(jwtTokenService.generarAccessToken(usuario)).thenReturn("access-token-nuevo");
        when(usuarioMapper.toDTO(usuario)).thenReturn(usuarioDTO());
        RefreshRequest request = new RefreshRequest("token-plano-valido");

        // WHEN
        AuthResponse respuesta = authService.refresh(request);

        // THEN
        assertTrue(tokenGuardado.isRevocado());
        ArgumentCaptor<TokenRefresco> captor = ArgumentCaptor.forClass(TokenRefresco.class);
        verify(tokenRefrescoRepository, times(2)).save(captor.capture());
        assertEquals(tokenGuardado, captor.getAllValues().get(0));
        assertEquals(familia, captor.getAllValues().get(1).getFamilia());
        assertEquals("access-token-nuevo", respuesta.getAccessToken());
    }

    // ---------- helpers ----------

    private RegisterRequest registerRequest() {
        return RegisterRequest.builder().nombreUsuario(NOMBRE_USUARIO).email(EMAIL).password(PASSWORD).build();
    }

    private LoginRequest loginRequest() {
        return LoginRequest.builder().nombreUsuario(NOMBRE_USUARIO).password(PASSWORD).build();
    }

    private Usuario usuarioConId() {
        Usuario usuario = new Usuario(NOMBRE_USUARIO, EMAIL, PASSWORD_HASH);
        ReflectionTestUtils.setField(usuario, "id", ID_USUARIO);
        return usuario;
    }

    private UsuarioDTO usuarioDTO() {
        return UsuarioDTO.builder().id(ID_USUARIO).nombreUsuario(NOMBRE_USUARIO).email(EMAIL).build();
    }
}
