package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.plataforma.dtos.EstadisticaDTO;
import ar.pazluciano.battleroyale.plataforma.entities.EstadisticaJugador;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.mappers.EstadisticaMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.EstadisticaJugadorRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("EstadisticaServiceImpl")
class EstadisticaServiceImplTest {

    private static final Long ID_USUARIO = 7L;

    @Mock
    private EstadisticaJugadorRepository estadisticaJugadorRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EstadisticaMapper estadisticaMapper;

    private EstadisticaServiceImpl estadisticaService;

    @BeforeEach
    void setUp() {
        estadisticaService = new EstadisticaServiceImpl(
                estadisticaJugadorRepository,
                usuarioRepository,
                estadisticaMapper
        );
    }

    @Test
    @DisplayName("misEstadisticas devuelve el DTO mapeado cuando la fila existe")
    void misEstadisticas_usuarioTieneEstadisticas_devuelveDTO() {
        // GIVEN
        EstadisticaJugador entidad = estadisticaDe(ID_USUARIO);
        EstadisticaDTO dto = EstadisticaDTO.builder().nombreUsuario("jugador7").build();
        when(estadisticaJugadorRepository.findByUsuarioId(ID_USUARIO)).thenReturn(Optional.of(entidad));
        when(estadisticaMapper.toDTO(entidad)).thenReturn(dto);

        // WHEN
        EstadisticaDTO resultado = estadisticaService.misEstadisticas(ID_USUARIO);

        // THEN
        assertEquals("jugador7", resultado.getNombreUsuario());
    }

    @Test
    @DisplayName("misEstadisticas sin fila de estadisticas crea la fila defensivamente (Lazy Init) y devuelve el DTO")
    void misEstadisticas_usuarioSinFilaDeEstadisticas_creaFilaDefensivamente() {
        // GIVEN
        Usuario usuario = usuarioDe(ID_USUARIO);
        EstadisticaJugador nuevaEntidad = new EstadisticaJugador(usuario);
        EstadisticaDTO dto = EstadisticaDTO.builder().nombreUsuario("jugador7").build();

        when(estadisticaJugadorRepository.findByUsuarioId(ID_USUARIO)).thenReturn(Optional.empty());
        when(usuarioRepository.findById(ID_USUARIO)).thenReturn(Optional.of(usuario));
        when(estadisticaJugadorRepository.save(any(EstadisticaJugador.class))).thenReturn(nuevaEntidad);
        when(estadisticaMapper.toDTO(nuevaEntidad)).thenReturn(dto);

        // WHEN
        EstadisticaDTO resultado = estadisticaService.misEstadisticas(ID_USUARIO);

        // THEN
        assertNotNull(resultado);
        assertEquals("jugador7", resultado.getNombreUsuario());
    }

    @Test
    @DisplayName("ranking mapea cada elemento de la pagina de entidades a DTO conservando el orden")
    void ranking_devuelvePaginaMapeada() {
        // GIVEN
        EstadisticaJugador entidad1 = estadisticaDe(1L);
        EstadisticaJugador entidad2 = estadisticaDe(2L);
        Pageable pageable = PageRequest.of(0, 10);
        Page<EstadisticaJugador> paginaEntidades = new PageImpl<>(List.of(entidad1, entidad2), pageable, 2);
        EstadisticaDTO dto1 = EstadisticaDTO.builder().nombreUsuario("jugador1").build();
        EstadisticaDTO dto2 = EstadisticaDTO.builder().nombreUsuario("jugador2").build();
        when(estadisticaJugadorRepository.findAllByOrderByVictoriasDescKillsDesc(pageable))
                .thenReturn(paginaEntidades);
        when(estadisticaMapper.toDTO(entidad1)).thenReturn(dto1);
        when(estadisticaMapper.toDTO(entidad2)).thenReturn(dto2);

        // WHEN
        Page<EstadisticaDTO> resultado = estadisticaService.ranking(pageable);

        // THEN
        assertEquals(2, resultado.getTotalElements());
        assertEquals("jugador1", resultado.getContent().get(0).getNombreUsuario());
        assertEquals("jugador2", resultado.getContent().get(1).getNombreUsuario());
    }

    private Usuario usuarioDe(Long idUsuario) {
        Usuario usuario = new Usuario("jugador" + idUsuario, "jugador" + idUsuario + "@test.com", "hash");
        ReflectionTestUtils.setField(usuario, "id", idUsuario);
        return usuario;
    }

    private EstadisticaJugador estadisticaDe(Long idUsuario) {
        return new EstadisticaJugador(usuarioDe(idUsuario));
    }
}
