package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Eje de VIDA del jugador, independiente de la conexion (R26).
 *
 * <p>Un jugador desconectado sigue estando {@link #VIVO} y por lo tanto es vulnerable a proyectiles
 * y a la zona: la conexion se modela aparte con un boolean en {@link Jugador}. Separar los dos ejes
 * evita el bug de la v2 donde un DESCONECTADO no recibia dano por no ser "VIVO".
 */
public enum EstadoVida {
    VIVO,
    MUERTO
}
