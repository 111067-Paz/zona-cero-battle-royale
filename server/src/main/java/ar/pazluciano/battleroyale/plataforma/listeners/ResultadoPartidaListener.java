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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persiste el resultado de una partida terminada (PLAN §5.4). Escucha {@link FinDePartidaEvent},
 * publicado por el MOTOR — la plataforma es la unica que sabe que existe la BD; el dominio jamas
 * lo supo.
 *
 * <p>Idempotente por {@code partidaId} UNIQUE (R13): si el evento llegara duplicado (reintento,
 * doble publicacion), el chequeo {@code existsByPartidaId} lo descarta antes de insertar.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResultadoPartidaListener {

    private static final String PREFIJO_HUMANO = "u-";

    private final ResultadoPartidaRepository resultadoPartidaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstadisticaJugadorRepository estadisticaJugadorRepository;

    @EventListener
    @Transactional
    public void alFinalizarPartida(FinDePartidaEvent evento) {
        ResumenPartida resumen = evento.getResumen();
        if (resultadoPartidaRepository.existsByPartidaId(resumen.getPartidaId())) {
            log.warn("Resultado ya persistido para partida {}, se descarta duplicado",
                    resumen.getPartidaId());
            return;
        }

        ResultadoPartida resultado = new ResultadoPartida(resumen.getPartidaId(),
                resumen.getFechaInicio(), resumen.getFechaFin(), resumen.getParticipantes().size());

        for (ParticipanteResumen participante : resumen.getParticipantes()) {
            if (!participante.getIdJugador().startsWith(PREFIJO_HUMANO)) {
                resultado.agregarParticipacion(new ParticipacionPartida(null,
                        participante.getPosicionFinal(), participante.getKills(),
                        participante.getMuertes()));
                continue;
            }

            Long idUsuario = Long.valueOf(participante.getIdJugador().substring(PREFIJO_HUMANO.length()));
            Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
            if (usuario == null) {
                log.warn("Usuario {} de la partida {} ya no existe, se omite su participacion",
                        idUsuario, resumen.getPartidaId());
                continue;
            }

            resultado.agregarParticipacion(new ParticipacionPartida(usuario,
                    participante.getPosicionFinal(), participante.getKills(),
                    participante.getMuertes()));

            int gano = participante.getPosicionFinal() != null && participante.getPosicionFinal() == 1 ? 1 : 0;
            int top3 = participante.getPosicionFinal() != null && participante.getPosicionFinal() <= 3 ? 1 : 0;
            estadisticaJugadorRepository.sumarResultado(idUsuario, gano, participante.getKills(),
                    participante.getMuertes(), top3);
        }

        resultadoPartidaRepository.save(resultado);
    }
}
