package ar.pazluciano.battleroyale.plataforma.listeners;

import ar.pazluciano.battleroyale.juego.motor.FinDePartidaEvent;
import ar.pazluciano.battleroyale.juego.motor.ParticipanteResumen;
import ar.pazluciano.battleroyale.juego.motor.ResumenPartida;
import ar.pazluciano.battleroyale.plataforma.entities.ParticipacionPartida;
import ar.pazluciano.battleroyale.plataforma.entities.ResultadoPartida;
import ar.pazluciano.battleroyale.plataforma.entities.Usuario;
import ar.pazluciano.battleroyale.plataforma.repositories.EstadisticaJugadorRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.ResultadoPartidaRepository;
import ar.pazluciano.battleroyale.plataforma.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("unit")
@DisplayName("ResultadoPartidaListener")
class ResultadoPartidaListenerTest {

    private static final String PARTIDA_ID = "partida-abc";

    @Mock
    private ResultadoPartidaRepository resultadoPartidaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EstadisticaJugadorRepository estadisticaJugadorRepository;

    private ResultadoPartidaListener listener;

    @BeforeEach
    void setUp() {
        listener = new ResultadoPartidaListener(resultadoPartidaRepository, usuarioRepository,
                estadisticaJugadorRepository);
    }

    @Test
    @DisplayName("si la partida ya fue persistida, descarta el evento sin tocar nada mas")
    void alFinalizarPartida_partidaYaExiste_noHaceNada() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(true);
        FinDePartidaEvent evento = eventoCon(participante("u-1", 1, 3, 0));

        // WHEN
        listener.alFinalizarPartida(evento);

        // THEN
        verify(resultadoPartidaRepository, never()).save(any());
        verify(usuarioRepository, never()).findById(any());
        verify(estadisticaJugadorRepository, never()).sumarResultado(any(), anyInt(), anyInt(), anyInt(), anyInt());
    }

    @Test
    @DisplayName("un participante bot crea una participacion sin usuario y no toca estadisticas")
    void alFinalizarPartida_participanteBot_creaParticipacionSinUsuario() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(false);
        FinDePartidaEvent evento = eventoCon(participante("bot-3", 2, 1, 1));

        // WHEN
        listener.alFinalizarPartida(evento);

        // THEN
        verify(usuarioRepository, never()).findById(any());
        verify(estadisticaJugadorRepository, never()).sumarResultado(any(), anyInt(), anyInt(), anyInt(), anyInt());
        ResultadoPartida guardado = capturarResultadoGuardado();
        assertEquals(1, guardado.getParticipaciones().size());
        assertNull(guardado.getParticipaciones().get(0).getUsuario());
    }

    @Test
    @DisplayName("un humano ganador suma victoria y top3 con sus kills/muertes")
    void alFinalizarPartida_ganador_sumaVictoriaYTop3() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(false);
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuarioConId(7L)));
        FinDePartidaEvent evento = eventoCon(participante("u-7", 1, 5, 0));

        // WHEN
        listener.alFinalizarPartida(evento);

        // THEN
        verify(estadisticaJugadorRepository).sumarResultado(7L, 1, 5, 0, 1);
    }

    @Test
    @DisplayName("un humano en el podio (2do o 3ro) suma top3 pero NO victoria")
    void alFinalizarPartida_top3SinGanar_sumaSoloTop3() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(false);
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuarioConId(7L)));
        FinDePartidaEvent evento = eventoCon(participante("u-7", 3, 2, 1));

        // WHEN
        listener.alFinalizarPartida(evento);

        // THEN
        verify(estadisticaJugadorRepository).sumarResultado(7L, 0, 2, 1, 1);
    }

    @Test
    @DisplayName("un humano fuera del podio (4to o peor) no suma victoria ni top3")
    void alFinalizarPartida_fueraDeTop3_noSumaVictoriaNiTop3() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(false);
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(usuarioConId(7L)));
        FinDePartidaEvent evento = eventoCon(participante("u-7", 4, 0, 1));

        // WHEN
        listener.alFinalizarPartida(evento);

        // THEN
        verify(estadisticaJugadorRepository).sumarResultado(7L, 0, 0, 1, 0);
    }

    @Test
    @DisplayName("si el usuario humano ya no existe, se omite su participacion sin romper el resto")
    void alFinalizarPartida_usuarioHumanoNoExiste_omiteParticipacionSinRomper() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(false);
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        FinDePartidaEvent evento = eventoCon(participante("u-99", 1, 5, 0), participante("bot-1", 2, 1, 1));

        // WHEN
        listener.alFinalizarPartida(evento);

        // THEN
        verify(estadisticaJugadorRepository, never()).sumarResultado(any(), anyInt(), anyInt(), anyInt(), anyInt());
        ResultadoPartida guardado = capturarResultadoGuardado();
        assertEquals(1, guardado.getParticipaciones().size());
    }

    @Test
    @DisplayName("guarda el ResultadoPartida con partidaId, fechas y cantidad de jugadores correctos")
    void alFinalizarPartida_guardaResultadoConDatosCorrectos() {
        // GIVEN
        when(resultadoPartidaRepository.existsByPartidaId(PARTIDA_ID)).thenReturn(false);
        LocalDateTime inicio = LocalDateTime.now().minusMinutes(5);
        LocalDateTime fin = LocalDateTime.now();
        ResumenPartida resumen = ResumenPartida.builder()
                .partidaId(PARTIDA_ID)
                .fechaInicio(inicio)
                .fechaFin(fin)
                .participantes(List.of(participante("bot-0", 1, 2, 0)))
                .build();

        // WHEN
        listener.alFinalizarPartida(new FinDePartidaEvent(resumen));

        // THEN
        ResultadoPartida guardado = capturarResultadoGuardado();
        assertEquals(PARTIDA_ID, guardado.getPartidaId());
        assertEquals(inicio, guardado.getFechaInicio());
        assertEquals(fin, guardado.getFechaFin());
        assertEquals(1, guardado.getCantidadJugadores());
    }

    // ---------- helpers ----------

    private ResultadoPartida capturarResultadoGuardado() {
        ArgumentCaptor<ResultadoPartida> captor = ArgumentCaptor.forClass(ResultadoPartida.class);
        verify(resultadoPartidaRepository).save(captor.capture());
        return captor.getValue();
    }

    private FinDePartidaEvent eventoCon(ParticipanteResumen... participantes) {
        ResumenPartida resumen = ResumenPartida.builder()
                .partidaId(PARTIDA_ID)
                .fechaInicio(LocalDateTime.now().minusMinutes(5))
                .fechaFin(LocalDateTime.now())
                .participantes(List.of(participantes))
                .build();
        return new FinDePartidaEvent(resumen);
    }

    private ParticipanteResumen participante(String idJugador, Integer posicionFinal, int kills, int muertes) {
        return ParticipanteResumen.builder()
                .idJugador(idJugador)
                .posicionFinal(posicionFinal)
                .kills(kills)
                .muertes(muertes)
                .build();
    }

    private Usuario usuarioConId(Long id) {
        Usuario usuario = new Usuario("jugador" + id, "jugador" + id + "@test.com", "hash");
        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
