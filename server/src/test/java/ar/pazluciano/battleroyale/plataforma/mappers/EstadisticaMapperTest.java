package ar.pazluciano.battleroyale.plataforma.mappers;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("unit")
@DisplayName("EstadisticaMapper")
class EstadisticaMapperTest {

    private final EstadisticaMapper mapper = new EstadisticaMapper();

    @Test
    @DisplayName("K/D con muertes en cero no divide por cero: usa max(1, muertes) (R38)")
    void toDTO_sinMuertes_calculaKdSobreUnoEnVezDeExplotar() {
        // GIVEN
        EstadisticaJugador entidad = estadisticaCon(10, 0);

        // WHEN
        EstadisticaDTO dto = mapper.toDTO(entidad);

        // THEN
        assertEquals(10.0, dto.getKd());
    }

    @Test
    @DisplayName("K/D con muertes > 0 divide kills sobre muertes normalmente")
    void toDTO_conMuertes_calculaKdNormal() {
        // GIVEN
        EstadisticaJugador entidad = estadisticaCon(9, 3);

        // WHEN
        EstadisticaDTO dto = mapper.toDTO(entidad);

        // THEN
        assertEquals(3.0, dto.getKd());
    }

    @Test
    @DisplayName("mapea nombreUsuario y todos los contadores tal cual estan en la entidad")
    void toDTO_mapeaTodosLosCampos() {
        // GIVEN
        EstadisticaJugador entidad = estadisticaCon(5, 2);
        entidad.setPartidasJugadas(8);
        entidad.setVictorias(2);
        entidad.setTop3(4);

        // WHEN
        EstadisticaDTO dto = mapper.toDTO(entidad);

        // THEN
        assertEquals("jugador1", dto.getNombreUsuario());
        assertEquals(8, dto.getPartidasJugadas());
        assertEquals(2, dto.getVictorias());
        assertEquals(5, dto.getKills());
        assertEquals(2, dto.getMuertes());
        assertEquals(4, dto.getTop3());
    }

    private EstadisticaJugador estadisticaCon(int kills, int muertes) {
        Usuario usuario = new Usuario("jugador1", "jugador1@test.com", "hash");
        ReflectionTestUtils.setField(usuario, "id", 1L);
        EstadisticaJugador entidad = new EstadisticaJugador(usuario);
        entidad.setKills(kills);
        entidad.setMuertes(muertes);
        return entidad;
    }
}
