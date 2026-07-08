package ar.pazluciano.battleroyale.comun.seguridad;

import ar.pazluciano.battleroyale.plataforma.services.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Valida el Bearer de cada request y puebla el {@code SecurityContext} (PLAN §4.2). El principal
 * es directamente el {@code idUsuario} (Long) — NO se busca el {@code Usuario} en la base en cada
 * request: evita una query extra por request y el riesgo de tocar una relacion LAZY fuera de
 * transaccion (el proyecto corre con {@code open-in-view: false}). Los controllers que necesitan
 * el usuario completo lo piden por id al service correspondiente.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIJO_BEARER = "Bearer ";

    private final JwtTokenService jwtTokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        extraerToken(request)
                .flatMap(jwtTokenService::validarYExtraerIdUsuario)
                .ifPresent(this::autenticar);
        filterChain.doFilter(request, response);
    }

    private Optional<String> extraerToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(PREFIJO_BEARER)) {
            return Optional.of(header.substring(PREFIJO_BEARER.length()));
        }
        return Optional.empty();
    }

    private void autenticar(Long idUsuario) {
        Authentication authentication = new UsernamePasswordAuthenticationToken(idUsuario, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
