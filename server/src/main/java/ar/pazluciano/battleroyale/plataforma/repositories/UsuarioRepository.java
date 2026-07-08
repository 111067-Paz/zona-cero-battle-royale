package ar.pazluciano.battleroyale.plataforma.repositories;

import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    boolean existsByNombreUsuario(String nombreUsuario);

    boolean existsByEmail(String email);

    Optional<Usuario> findByNombreUsuario(String nombreUsuario);
}
