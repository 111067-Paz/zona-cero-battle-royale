package ar.pazluciano.battleroyale.juego.dominio.bots;

/**
 * Un estado de la FSM del bot (patron State). Cada estado escribe la intencion del bot y devuelve el
 * PROXIMO estado (el mismo si no hay transicion). Sumar un estado nuevo (BuscarZona en F4, Huir,
 * Cubrirse) es una clase mas — sin ningun switch central que tocar.
 */
public interface EstadoComportamiento {

    EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados);
}
