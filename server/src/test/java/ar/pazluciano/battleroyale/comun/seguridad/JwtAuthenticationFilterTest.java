package ar.pazluciano.battleroyale.comun.seguridad;

import ar.pazluciano.battleroyale.plataforma.services.JwtTokenService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("JwtAuthenticationFilter")
class JwtAuthenticationFilterTest {

    private static final Long ID_USUARIO = 42L;

    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtTokenService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("con un Bearer valido, puebla el SecurityContext con el id de usuario como principal")
    void doFilterInternal_conTokenValido_pueblaSecurityContext() throws Exception {
        // GIVEN
        when(jwtTokenService.validarYExtraerIdUsuario("token-valido")).thenReturn(Optional.of(ID_USUARIO));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-valido");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // WHEN
        filter.doFilterInternal(request, response, filterChain);

        // THEN
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertEquals(ID_USUARIO, authentication.getPrincipal());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("sin header Authorization, no toca el SecurityContext pero continua la cadena")
    void doFilterInternal_sinHeaderAuthorization_noPueblaSecurityContext() throws Exception {
        // GIVEN
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        // WHEN
        filter.doFilterInternal(request, response, filterChain);

        // THEN
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("con un token rechazado por el servicio, no toca el SecurityContext")
    void doFilterInternal_conTokenInvalido_noPueblaSecurityContext() throws Exception {
        // GIVEN
        when(jwtTokenService.validarYExtraerIdUsuario("token-basura")).thenReturn(Optional.empty());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-basura");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // WHEN
        filter.doFilterInternal(request, response, filterChain);

        // THEN
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("con un header Authorization que no empieza con 'Bearer ', lo ignora")
    void doFilterInternal_headerSinPrefijoBearer_noPueblaSecurityContext() throws Exception {
        // GIVEN
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic algo-que-no-es-bearer");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // WHEN
        filter.doFilterInternal(request, response, filterChain);

        // THEN
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }
}
