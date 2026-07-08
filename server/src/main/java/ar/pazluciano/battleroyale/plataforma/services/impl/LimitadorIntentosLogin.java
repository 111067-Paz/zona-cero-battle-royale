package ar.pazluciano.battleroyale.plataforma.services.impl;

import ar.pazluciano.battleroyale.comun.config.ConfiguracionRateLimit;
import ar.pazluciano.battleroyale.plataforma.exceptions.DemasiadosIntentosException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Rate limit de {@code /api/auth/login} (PLAN §10-F5): MVP en memoria, no distribuido — alcanza
 * para una sola instancia de dev/personal. Una libreria como bucket4j seria sobre-ingenieria aca.
 */
@Component
@RequiredArgsConstructor
public class LimitadorIntentosLogin {

    private final ConfiguracionRateLimit config;
    private final Map<String, List<Instant>> intentosPorUsuario = new ConcurrentHashMap<>();

    public void verificarPermitido(String nombreUsuario) {
        List<Instant> intentos = intentosDe(nombreUsuario);
        purgarVencidos(intentos);
        if (intentos.size() >= config.getIntentosMaximos()) {
            throw new DemasiadosIntentosException(
                    "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.");
        }
    }

    public void registrarIntentoFallido(String nombreUsuario) {
        intentosDe(nombreUsuario).add(Instant.now());
    }

    /** Login exitoso: reinicia el contador de ese usuario. */
    public void limpiar(String nombreUsuario) {
        intentosPorUsuario.remove(nombreUsuario);
    }

    private List<Instant> intentosDe(String nombreUsuario) {
        return intentosPorUsuario.computeIfAbsent(nombreUsuario, id -> new CopyOnWriteArrayList<>());
    }

    private void purgarVencidos(List<Instant> intentos) {
        Instant limite = Instant.now().minus(config.getVentanaMinutos(), ChronoUnit.MINUTES);
        intentos.removeIf(instante -> instante.isBefore(limite));
    }
}
