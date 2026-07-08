package ar.pazluciano.battleroyale.juego.dominio.botin;

/**
 * Que puede aparecer en un spawn de botin (PLAN §4.1). Las tres armas espejan {@code TipoArma}: al
 * recogerlas, la Partida materializa el arma concreta correspondiente.
 */
public enum TipoBotin {
    BOTIQUIN,
    PISTOLA,
    ESCOPETA,
    RIFLE
}
