package ar.pazluciano.battleroyale.juego.protocolo;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Getter;
import lombok.Setter;

/**
 * Mensaje entrante del cliente. Jackson resuelve la subclase concreta por el campo {@code tipo}
 * (PLAN §5.1). Un {@code tipo} desconocido lanza excepcion de deserializacion que el handler
 * traduce en strike (3 strikes -> cierre, §5.3).
 *
 * <p>Todo mensaje lleva {@code v} (version del protocolo): una version distinta se rechaza con
 * cierre limpio.
 */
@Getter
@Setter
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "tipo",
        visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = Unirse.class, name = "UNIRSE"),
        @JsonSubTypes.Type(value = Input.class, name = "INPUT"),
        @JsonSubTypes.Type(value = Salir.class, name = "SALIR")
})
public abstract sealed class MensajeCliente permits Unirse, Input, Salir {

    /** Version del protocolo. En v1 siempre vale 1. */
    private int v;

    /** Discriminador de subtipo: UNIRSE | INPUT | SALIR. */
    private String tipo;
}
