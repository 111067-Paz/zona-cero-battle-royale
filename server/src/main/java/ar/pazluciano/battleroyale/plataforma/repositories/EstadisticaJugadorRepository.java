package ar.pazluciano.battleroyale.plataforma.repositories;

import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EstadisticaJugadorRepository extends JpaRepository<EstadisticaJugador, Long> {

    Optional<EstadisticaJugador> findByUsuarioId(Long usuarioId);

    /** Ranking del lobby (PLAN §15.2): mas victorias primero, kills como desempate. */
    Page<EstadisticaJugador> findAllByOrderByVictoriasDescKillsDesc(Pageable pageable);

    /**
     * UPDATE atomico (R13): suma sobre los valores actuales en la MISMA sentencia SQL, nunca
     * leer-modificar-guardar. Evita perder updates si dos resultados del mismo usuario se
     * persisten cerca en el tiempo (dos partidas terminando casi simultaneas).
     */
    @Modifying
    @Query("""
            UPDATE EstadisticaJugador e SET
                e.partidasJugadas = e.partidasJugadas + 1,
                e.victorias = e.victorias + :victorias,
                e.kills = e.kills + :kills,
                e.muertes = e.muertes + :muertes,
                e.top3 = e.top3 + :top3
            WHERE e.usuario.id = :usuarioId
            """)
    void sumarResultado(@Param("usuarioId") Long usuarioId, @Param("victorias") int victorias,
                        @Param("kills") int kills, @Param("muertes") int muertes, @Param("top3") int top3);
}
