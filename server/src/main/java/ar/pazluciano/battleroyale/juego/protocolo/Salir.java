package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Abandono voluntario (PLAN §5.1). La semantica depende del estado de la partida (R23): en lobby
 * el jugador simplemente se va; en curso cuenta como abandono y equivale a muerte.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class Salir extends MensajeCliente {
}
