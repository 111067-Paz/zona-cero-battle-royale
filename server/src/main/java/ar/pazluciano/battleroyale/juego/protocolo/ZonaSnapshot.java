package ar.pazluciano.battleroyale.juego.protocolo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista por VALOR de la zona segura (PLAN §5.2/§7-E). {@code radioProximo} es a donde se dirige la
 * contraccion en curso (o la proxima, si esta en espera) — el cliente dibuja el circulo actual y el
 * "aviso" del que viene, mismo centro (F4: contraccion concentrica).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZonaSnapshot {

    private double cx;
    private double cy;
    private double radio;
    private int fase;
    private double radioProximo;

    /** Ticks restantes de la fase actual (contraccion o espera), para el HUD "GAS CLOSING". */
    private int ticksParaProximoCambio;
}
