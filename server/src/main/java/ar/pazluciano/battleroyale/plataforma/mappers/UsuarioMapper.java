package ar.pazluciano.battleroyale.plataforma.mappers;

import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import org.springframework.stereotype.Component;

@Component
public class UsuarioMapper {

    public UsuarioDTO toDTO(Usuario entity) {
        return UsuarioDTO.builder()
                .id(entity.getId())
                .nombreUsuario(entity.getNombreUsuario())
                .email(entity.getEmail())
                .build();
    }
}
