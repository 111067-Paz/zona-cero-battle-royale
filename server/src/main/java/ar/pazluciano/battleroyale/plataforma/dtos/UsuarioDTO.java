package ar.pazluciano.battleroyale.plataforma.dtos;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Perfil publico. JAMAS incluye el passwordHash. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioDTO {

    private Long id;
    private String nombreUsuario;
    private String email;
    private Personaje personaje;
}
