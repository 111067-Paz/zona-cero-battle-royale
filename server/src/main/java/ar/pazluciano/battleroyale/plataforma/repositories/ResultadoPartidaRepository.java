package ar.pazluciano.battleroyale.plataforma.repositories;

import ar.pazluciano.battleroyale.plataforma.entities.ResultadoPartida;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResultadoPartidaRepository extends JpaRepository<ResultadoPartida, Long> {

    /** Base de la exactamente-una-vez (R13): el listener chequea esto antes de insertar. */
    boolean existsByPartidaId(String partidaId);
}
