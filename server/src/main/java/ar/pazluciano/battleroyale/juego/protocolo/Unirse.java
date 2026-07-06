package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Pedido de union a una partida (PLAN §5.1).
 *
 * <p>En las Fases 0-4 el {@code ticket} viaja nulo (perfil dev). Desde la Fase 5 es obligatorio:
 * el server lo canjea (delete-on-use) para asociar la sesion al usuario autenticado.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public final class Unirse extends MensajeCliente {

    /** Ticket opaco de un solo uso. Nulo en las Fases 0-4. */
    private String ticket;
}
