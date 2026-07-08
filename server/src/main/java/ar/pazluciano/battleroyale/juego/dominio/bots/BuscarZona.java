package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

/**
 * Fuera de la zona segura: el bot camina hacia el centro, sin disparar, hasta volver a estar adentro
 * (PLAN §8.3: "fuera de zona priorizan BUSCAR_ZONA"). {@link ComportamientoFsm} fuerza este estado
 * con PRIORIDAD sobre cualquier otro (interrumpe Perseguir/Atacar) mientras dure la emergencia; al
 * volver a la zona, retoma el comportamiento normal desde Merodear.
 */
public class BuscarZona implements EstadoComportamiento {

    @Override
    public EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados) {
        if (!contexto.estaFueraDeZona()) {
            return estados.merodeando();
        }
        Vector2 direccion = contexto.direccionHaciaZona();
        contexto.aplicarIntencion(direccion, Math.atan2(direccion.getY(), direccion.getX()), false);
        return this;
    }
}
