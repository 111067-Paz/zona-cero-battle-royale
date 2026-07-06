package ar.pazluciano.battleroyale.juego.dominio.combate;

/**
 * Catalogo de armas del juego. Viaja en el snapshot como el nombre del arma equipada (PLAN §5.2).
 *
 * <p>Sumar un arma nueva es agregar un valor aca + su clase {@link Arma}: el resto de la simulacion
 * no cambia (Open/Closed). El conjunto es cerrado a proposito (decision de diseno del juego), lo que
 * habilita despacho exhaustivo y determinismo.
 */
public enum TipoArma {
    PISTOLA,
    ESCOPETA,
    RIFLE
}
