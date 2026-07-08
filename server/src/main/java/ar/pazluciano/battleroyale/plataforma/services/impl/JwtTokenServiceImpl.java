package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJwt;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.services.JwtTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

/**
 * Emite y valida el access token (PLAN §4.2). El refresh token NO es un JWT: es un valor opaco
 * (ver {@code AuthServiceImpl}) — solo el access token necesita ser autocontenido y verificable
 * sin tocar la base en cada request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtTokenServiceImpl implements JwtTokenService {

    private static final String CLAIM_USERNAME = "username";

    private final ConfiguracionJwt config;

    private SecretKey clave;

    @PostConstruct
    void inicializarClave() {
        this.clave = Keys.hmacShaKeyFor(config.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String generarAccessToken(Usuario usuario) {
        Date ahora = new Date();
        Date expiracion = new Date(ahora.getTime() + config.accessMinutosEnMillis());
        return Jwts.builder()
                .subject(usuario.getId().toString())
                .claim(CLAIM_USERNAME, usuario.getNombreUsuario())
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(clave)
                .compact();
    }

    @Override
    public Optional<Long> validarYExtraerIdUsuario(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(clave)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(Long.parseLong(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token rechazado: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
