package ar.pazluciano.battleroyale.plataforma.services;

import ar.pazluciano.battleroyale.plataforma.dtos.AuthResponse;
import ar.pazluciano.battleroyale.plataforma.dtos.LoginRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RefreshRequest;
import ar.pazluciano.battleroyale.plataforma.dtos.RegisterRequest;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    /** Rotacion (R18): el token usado se marca; si se reusa un token YA marcado, revoca la familia. */
    AuthResponse refresh(RefreshRequest request);
}
