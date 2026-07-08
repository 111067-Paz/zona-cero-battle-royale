package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionJwt;
import ar.pazluciano.battleroyale.plataforma.dtos.AuthResponse;
import ar.pazluciano.battleroyale.plataforma.dtos.LoginRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RefreshRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RegisterRequest;
import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import ar.pazluciano.battleroyale.plataforma.entities.TokenRefresco;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.exceptions.CredencialesInvalidasException;
import ar.pazluciano.battleroyale.plataforma.exceptions.TokenInvalidoException;
import ar.pazluciano.battleroyale.plataforma.exceptions.UsuarioYaExisteException;
import ar.pazluciano.battleroyale.plataforma.mappers.UsuarioMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.EstadisticaJugadorRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.TokenRefrescoRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import ar.pazluciano.battleroyale.plataforma.services.AuthService;
import ar.pazluciano.battleroyale.plataforma.services.JwtTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * Registro, login y refresh con rotacion (PLAN §4.2/§5.5). El refresh token es un valor OPACO
 * (no un JWT): se hashea con SHA-256 antes de guardarlo — a diferencia de BCrypt (para passwords,
 * NO determinista por diseño: cada llamada usa un salt nuevo), SHA-256 es determinista, que es
 * justo lo que hace falta para poder BUSCAR el token por su hash en un refresh posterior. Un
 * refresh token es un valor de alta entropia generado al azar (no una contrasenia humana de baja
 * entropia): no necesita el costo computacional de BCrypt para resistir fuerza bruta offline.
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UsuarioRepository usuarioRepository;
    private final EstadisticaJugadorRepository estadisticaJugadorRepository;
    private final TokenRefrescoRepository tokenRefrescoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final UsuarioMapper usuarioMapper;
    private final LimitadorIntentosLogin limitador;
    private final ConfiguracionJwt configuracionJwt;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByNombreUsuario(request.getNombreUsuario())) {
            throw new UsuarioYaExisteException("El nombre de usuario ya esta en uso");
        }
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new UsuarioYaExisteException("El email ya esta registrado");
        }
        Usuario usuario = new Usuario(request.getNombreUsuario(), request.getEmail(),
                passwordEncoder.encode(request.getPassword()));
        usuario = usuarioRepository.save(usuario);
        estadisticaJugadorRepository.save(new EstadisticaJugador(usuario));
        return emitirTokens(usuario, UUID.randomUUID());
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        limitador.verificarPermitido(request.getNombreUsuario());
        Usuario usuario = usuarioRepository.findByNombreUsuario(request.getNombreUsuario())
                .orElseThrow(() -> credencialesInvalidas(request.getNombreUsuario()));
        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            throw credencialesInvalidas(request.getNombreUsuario());
        }
        limitador.limpiar(request.getNombreUsuario());
        return emitirTokens(usuario, UUID.randomUUID());
    }

    @Override
    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String hash = hashearToken(request.getRefreshToken());
        TokenRefresco tokenGuardado = tokenRefrescoRepository.findByHashToken(hash)
                .orElseThrow(() -> new TokenInvalidoException("Refresh token invalido"));

        if (tokenGuardado.isRevocado()) {
            // Reuso de un token YA usado: senial de robo (R18) -> se revoca TODA la familia.
            tokenRefrescoRepository.revocarFamilia(tokenGuardado.getFamilia());
            throw new TokenInvalidoException("Refresh token comprometido: sesion cerrada por seguridad");
        }
        if (tokenGuardado.getExpiracion().isBefore(LocalDateTime.now())) {
            throw new TokenInvalidoException("Refresh token expirado");
        }

        tokenGuardado.setRevocado(true); // rotacion: este token queda usado
        tokenRefrescoRepository.save(tokenGuardado);
        return emitirTokens(tokenGuardado.getUsuario(), tokenGuardado.getFamilia());
    }

    private CredencialesInvalidasException credencialesInvalidas(String nombreUsuario) {
        limitador.registrarIntentoFallido(nombreUsuario);
        // Mensaje generico a proposito: no revela si fallo el usuario o la contrasenia.
        return new CredencialesInvalidasException("Usuario o contrasenia incorrectos");
    }

    private AuthResponse emitirTokens(Usuario usuario, UUID familia) {
        String accessToken = jwtTokenService.generarAccessToken(usuario);
        String refreshTokenPlano = generarRefreshTokenOpaco();
        LocalDateTime expiracion = LocalDateTime.now().plusDays(configuracionJwt.getRefreshDias());
        tokenRefrescoRepository.save(
                new TokenRefresco(usuario, hashearToken(refreshTokenPlano), familia, expiracion));
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenPlano)
                .expiraEnSegundos(configuracionJwt.getAccessMinutos() * 60L)
                .usuario(usuarioMapper.toDTO(usuario))
                .build();
    }

    private String generarRefreshTokenOpaco() {
        return UUID.randomUUID().toString() + UUID.randomUUID();
    }

    private String hashearToken(String tokenPlano) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(tokenPlano.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible en esta JVM", e);
        }
    }
}
