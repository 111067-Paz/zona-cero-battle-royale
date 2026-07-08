package ar.pazluciano.battleroyale.plataforma.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;

    /** Segundos hasta que expira el access token, para que el cliente agende el refresh. */
    private long expiraEnSegundos;

    private UsuarioDTO usuario;
}
