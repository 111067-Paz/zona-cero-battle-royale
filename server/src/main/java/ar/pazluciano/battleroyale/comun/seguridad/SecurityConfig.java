package ar.pazluciano.battleroyale.comun.seguridad;

import ar.pazluciano.battleroyale.comun.errores.ErrorApi;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Filter chain deny-by-default (PLAN §10-F5): todo protegido salvo lo explicitamente publico. Sin
 * sesion (JWT stateless), sin CSRF (una API sin cookies de sesion no lo necesita).
 *
 * <p>Los handlers de "no autenticado"/"sin permiso" devuelven el MISMO {@link ErrorApi} que
 * {@code GlobalExceptionHandler}: esas dos rutas de error ocurren en el filter chain, ANTES de
 * llegar al {@code @RestControllerAdvice}, asi que necesitan su propio traductor a ese formato.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/mapas/**", "/ws/**", "/h2-console/**",
                                "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .anyRequest().authenticated())
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())) // h2-console usa frames
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(this::alNoAutenticado)
                        .accessDeniedHandler(this::alSinPermiso))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void alNoAutenticado(HttpServletRequest request, HttpServletResponse response, Exception exception)
            throws IOException {
        escribirError(response, HttpStatus.UNAUTHORIZED, "No autenticado");
    }

    private void alSinPermiso(HttpServletRequest request, HttpServletResponse response, Exception exception)
            throws IOException {
        escribirError(response, HttpStatus.FORBIDDEN, "Sin permisos para este recurso");
    }

    private void escribirError(HttpServletResponse response, HttpStatus status, String mensaje) throws IOException {
        ErrorApi error = ErrorApi.builder()
                .timestamp(LocalDateTime.now().format(FORMATTER))
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(mensaje)
                .build();
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
