package ar.pazluciano.battleroyale.juego.motor;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lista de emision de una partida y punto unico de envio (PLAN §2.4). Es propiedad EXCLUSIVA del
 * hilo del loop: solo el loop la modifica y la recorre, por eso no necesita sincronizacion.
 *
 * <p>Regla R25: una sesion se {@link #registrar registra} recien despues de recibir su BIENVENIDA,
 * y como el snapshot se emite mas tarde en el mismo tick, es imposible que reciba un SNAPSHOT antes
 * de su BIENVENIDA. El snapshot se serializa UNA sola vez y se reparte a todas las sesiones.
 */
@Slf4j
public class EmisorPartida {

    private final ObjectMapper objectMapper;
    private final Map<String, ConexionJugador> sesiones = new LinkedHashMap<>();

    public EmisorPartida(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Suma una conexion a la lista de emision. Llamado por el loop tras enviar la BIENVENIDA (R25). */
    public void registrar(ConexionJugador conexion) {
        sesiones.put(conexion.idJugador(), conexion);
    }

    public void quitar(String idJugador) {
        sesiones.remove(idJugador);
    }

    /** Serializa y envia un mensaje a UNA conexion puntual (BIENVENIDA). */
    public void enviarA(ConexionJugador conexion, Object mensaje) {
        String json = serializar(mensaje);
        if (json != null) {
            conexion.enviar(json);
        }
    }

    /** Serializa el snapshot UNA vez y lo reparte a todas las sesiones registradas. */
    public void emitir(Object snapshot) {
        String json = serializar(snapshot);
        if (json == null) {
            return;
        }
        for (ConexionJugador conexion : sesiones.values()) {
            conexion.enviar(json);
        }
    }

    /** Cierra todas las conexiones (fin de partida / apagado). */
    public void cerrarTodas() {
        for (ConexionJugador conexion : sesiones.values()) {
            conexion.cerrar();
        }
        sesiones.clear();
    }

    private String serializar(Object mensaje) {
        try {
            return objectMapper.writeValueAsString(mensaje);
        } catch (JacksonException e) {
            log.error("No se pudo serializar el mensaje {}: {}", mensaje.getClass().getSimpleName(), e.getMessage());
            return null;
        }
    }
}
