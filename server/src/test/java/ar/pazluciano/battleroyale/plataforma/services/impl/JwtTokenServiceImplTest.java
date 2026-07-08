package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJwt;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
@DisplayName("JwtTokenServiceImpl")
class JwtTokenServiceImplTest {

    private static final Long ID_USUARIO = 42L;
    private static final String SECRET =
            "cambiame-en-produccion-esto-es-solo-para-desarrollo-local-1234567890";

    private JwtTokenServiceImpl jwtTokenService;

    @BeforeEach
    void setUp() {
        ConfiguracionJwt config = new ConfiguracionJwt();
        config.setSecret(SECRET);
        config.setAccessMinutos(15);
        config.setRefreshDias(30);
        jwtTokenService = new JwtTokenServiceImpl(config);
        // @PostConstruct no corre fuera de un contenedor: se invoca manualmente (mismo paquete).
        jwtTokenService.inicializarClave();
    }

    @Test
    @DisplayName("genera un access token y lo valida devolviendo el mismo id de usuario")
    void generarAccessToken_yValidarYExtraerIdUsuario_devuelveElMismoId() {
        // GIVEN
        Usuario usuario = new Usuario("jugador1", "jugador1@test.com", "hash");
        ReflectionTestUtils.setField(usuario, "id", ID_USUARIO);

        // WHEN
        String token = jwtTokenService.generarAccessToken(usuario);
        Optional<Long> idExtraido = jwtTokenService.validarYExtraerIdUsuario(token);

        // THEN
        assertTrue(idExtraido.isPresent());
        assertEquals(ID_USUARIO, idExtraido.get());
    }

    @Test
    @DisplayName("un token con formato invalido devuelve Optional vacio")
    void validarYExtraerIdUsuario_tokenInvalido_devuelveEmpty() {
        // WHEN
        Optional<Long> resultado = jwtTokenService.validarYExtraerIdUsuario("esto-no-es-un-jwt");

        // THEN
        assertTrue(resultado.isEmpty());
    }

    @Test
    @DisplayName("un token firmado con otra clave devuelve Optional vacio")
    void validarYExtraerIdUsuario_tokenFirmadoConOtraClave_devuelveEmpty() {
        // GIVEN
        SecretKey otraClave = Keys.hmacShaKeyFor(
                "otra-clave-completamente-distinta-de-64-bytes-para-hs256-xxxxx".getBytes());
        String tokenAjeno = Jwts.builder()
                .subject(ID_USUARIO.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(otraClave)
                .compact();

        // WHEN
        Optional<Long> resultado = jwtTokenService.validarYExtraerIdUsuario(tokenAjeno);

        // THEN
        assertTrue(resultado.isEmpty());
    }

    @Test
    @DisplayName("un token expirado devuelve Optional vacio")
    void validarYExtraerIdUsuario_tokenExpirado_devuelveEmpty() {
        // GIVEN
        SecretKey clave = (SecretKey) ReflectionTestUtils.getField(jwtTokenService, "clave");
        String tokenExpirado = Jwts.builder()
                .subject(ID_USUARIO.toString())
                .issuedAt(new Date(System.currentTimeMillis() - 120_000))
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(clave)
                .compact();

        // WHEN
        Optional<Long> resultado = jwtTokenService.validarYExtraerIdUsuario(tokenExpirado);

        // THEN
        assertTrue(resultado.isEmpty());
    }
}
