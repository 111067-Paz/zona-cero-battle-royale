package ar.pazluciano.battleroyale.juego.protocolo;

import ar.pazluciano.battleroyale.comun.personajes.Personaje;
import ar.pazluciano.battleroyale.juego.dominio.combate.TipoArma;
import ar.pazluciano.battleroyale.juego.dominio.partida.EstadoVida;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista por VALOR de un jugador dentro de un {@link Snapshot} (PLAN §5.2). Es una copia: jamas
 * referencia al objeto vivo del dominio ni a un slot del pool (R14), para que serializar fuera del
 * tick no lea estado a medio mutar.
 *
 * <p>Lleva los dos ejes de R26 ({@code estadoVida} + {@code conectado}) desde la Fase 0 aunque el
 * combate y la desconexion recien se ejerciten mas adelante: asi el contrato no cambia despues.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JugadorSnapshot {

    private String id;
    private double x;
    private double y;
    private double angulo;
    private int hp;
    private EstadoVida estadoVida;
    private boolean conectado;
    private TipoArma arma;
    private int kills;

    /** Botiquines en inventario (0-3, R28), para el quick-slot del HUD. */
    private int botiquines;

    /** Aspecto elegido por el usuario (o el que le toco a un bot en la rotacion). */
    private Personaje personaje;
}
