package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.plataforma.dtos.UsuarioDTO;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.exceptions.PersonajeInvalidoException;
import ar.pazluciano.battleroyale.plataforma.mappers.UsuarioMapper;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("PerfilServiceImpl")
class PerfilServiceImplTest {

    private static final Long ID_USUARIO = 7L;

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private UsuarioMapper usuarioMapper;

    private PerfilServiceImpl perfilService;

    @BeforeEach
    void setUp() {
        perfilService = new PerfilServiceImpl(usuarioRepository, usuarioMapper);
    }

    @Test
    @DisplayName("actualizarPersonaje con un texto valido lo persiste y devuelve el DTO mapeado")
    void actualizarPersonaje_textoValido_persisteYDevuelveDTO() {
        // GIVEN
        Usuario usuario = usuarioDe(ID_USUARIO);
        UsuarioDTO dto = UsuarioDTO.builder().id(ID_USUARIO).personaje(Personaje.DINO).build();
        when(usuarioRepository.findById(ID_USUARIO)).thenReturn(Optional.of(usuario));
        when(usuarioMapper.toDTO(usuario)).thenReturn(dto);

        // WHEN
        UsuarioDTO resultado = perfilService.actualizarPersonaje(ID_USUARIO, "DINO");

        // THEN
        assertEquals(Personaje.DINO, usuario.getPersonaje());
        assertEquals(Personaje.DINO, resultado.getPersonaje());
    }

    @Test
    @DisplayName("actualizarPersonaje es insensible a mayusculas/minusculas")
    void actualizarPersonaje_textoEnMinusculas_looksUpCorrectamente() {
        // GIVEN
        Usuario usuario = usuarioDe(ID_USUARIO);
        when(usuarioRepository.findById(ID_USUARIO)).thenReturn(Optional.of(usuario));
        when(usuarioMapper.toDTO(usuario)).thenReturn(UsuarioDTO.builder().build());

        // WHEN
        perfilService.actualizarPersonaje(ID_USUARIO, "conejo");

        // THEN
        assertEquals(Personaje.CONEJO, usuario.getPersonaje());
    }

    @Test
    @DisplayName("actualizarPersonaje con un texto invalido lanza PersonajeInvalidoException y no toca el repo")
    void actualizarPersonaje_textoInvalido_lanzaExcepcionSinTocarElUsuario() {
        // WHEN + THEN
        PersonajeInvalidoException excepcion = assertThrows(PersonajeInvalidoException.class,
                () -> perfilService.actualizarPersonaje(ID_USUARIO, "ROBOT-INEXISTENTE"));
        assertEquals("Personaje invalido: ROBOT-INEXISTENTE", excepcion.getMessage());
        verify(usuarioRepository, never()).findById(ID_USUARIO);
    }

    @Test
    @DisplayName("actualizarPersonaje con usuario inexistente lanza IllegalStateException (invariante roto)")
    void actualizarPersonaje_usuarioInexistente_lanzaIllegalState() {
        // GIVEN
        when(usuarioRepository.findById(ID_USUARIO)).thenReturn(Optional.empty());

        // WHEN + THEN
        assertThrows(IllegalStateException.class, () -> perfilService.actualizarPersonaje(ID_USUARIO, "GATO"));
    }

    @Test
    @DisplayName("personajeDe devuelve el personaje ya persistido del usuario")
    void personajeDe_usuarioExistente_devuelveSuPersonaje() {
        // GIVEN
        Usuario usuario = usuarioDe(ID_USUARIO);
        usuario.setPersonaje(Personaje.ARDILLA);
        when(usuarioRepository.findById(ID_USUARIO)).thenReturn(Optional.of(usuario));

        // WHEN
        Personaje resultado = perfilService.personajeDe(ID_USUARIO);

        // THEN
        assertEquals(Personaje.ARDILLA, resultado);
    }

    @Test
    @DisplayName("personajeDe con usuario inexistente lanza IllegalStateException")
    void personajeDe_usuarioInexistente_lanzaIllegalState() {
        // GIVEN
        when(usuarioRepository.findById(ID_USUARIO)).thenReturn(Optional.empty());

        // WHEN + THEN
        assertThrows(IllegalStateException.class, () -> perfilService.personajeDe(ID_USUARIO));
    }

    private Usuario usuarioDe(Long id) {
        Usuario usuario = new Usuario("jugador" + id, "jugador" + id + "@test.com", "hash");
        ReflectionTestUtils.setField(usuario, "id", id);
        usuario.setPersonaje(Personaje.GATO);
        return usuario;
    }
}
