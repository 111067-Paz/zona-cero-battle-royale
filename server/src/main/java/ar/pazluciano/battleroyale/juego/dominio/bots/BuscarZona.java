package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

/**
 * Fuera de la zona segura: el bot camina hacia el centro, sin disparar, hasta volver a estar adentro
 * (PLAN §8.3: "fuera de zona priorizan BUSCAR_ZONA"). {@link ComportamientoFsm} fuerza este estado
 * con PRIORIDAD sobre cualquier otro (interrumpe Perseguir/Atacar) mientras dure la emergencia; al
 * volver a la zona, retoma el comportamiento normal desde Merodear.
 */
public class BuscarZona implements EstadoComportamiento {

    private static final double DISTANCIA_EXPLORACION = 8.0;
    private static final double[] ANGULOS_ESCAPE = { Math.PI / 4.0, -Math.PI / 4.0, Math.PI / 2.0, -Math.PI / 2.0 };

    @Override
    public EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados) {
        if (!contexto.estaFueraDeZona()) {
            return estados.merodeando();
        }
        Vector2 direccion = direccionDeEscape(contexto);
        if (direccion.longitud() > 1e-6) {
            contexto.aplicarIntencion(direccion, Math.atan2(direccion.getY(), direccion.getX()), false);
        } else {
            contexto.aplicarIntencion(new Vector2(1, 0), 0.0, false);
        }
        return this;
    }

    private Vector2 direccionDeEscape(ContextoBot contexto) {
        Vector2 directa = contexto.direccionHaciaZona();
        Vector2 origen = contexto.getJugador().getPosicion();
        Vector2 centro = contexto.getMundo().centroZona();
        if (contexto.getMundo().hayLineaDeVista(origen, centro)) {
            return directa;
        }
        double angulo = Math.atan2(directa.getY(), directa.getX());
        for (double delta : ANGULOS_ESCAPE) {
            double candidatoAngulo = angulo + delta;
            Vector2 candidato = new Vector2(Math.cos(candidatoAngulo), Math.sin(candidatoAngulo));
            Vector2 puntoExploracion = origen.sumar(candidato.escalar(DISTANCIA_EXPLORACION));
            if (contexto.getMundo().hayLineaDeVista(origen, puntoExploracion)) {
                return candidato;
            }
        }
        return directa;
    }
}
