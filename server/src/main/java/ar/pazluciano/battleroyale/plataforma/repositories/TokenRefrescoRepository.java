package ar.pazluciano.battleroyale.plataforma.repositories;

import ar.pazluciano.battleroyale.plataforma.entities.TokenRefresco;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface TokenRefrescoRepository extends JpaRepository<TokenRefresco, Long> {

    Optional<TokenRefresco> findByHashToken(String hashToken);

    /** Senal de robo (R18): un token ya usado se vuelve a presentar -> se revoca TODA la familia. */
    @Modifying
    @Query("UPDATE TokenRefresco t SET t.revocado = true WHERE t.familia = :familia")
    void revocarFamilia(@Param("familia") UUID familia);
}
