package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

/**
 * Fuera de la zona segura: el bot camina hacia el centro, sin disparar, hasta adentrarse
 * con seguridad en el interior de la zona (PLAN §8.3: "fuera de zona priorizan BUSCAR_ZONA").
 *
 * <p>Aplica un bucle de HISTERESIS con {@code MARGEN_DESENGANCHE_SEGURIDAD = 3.5u}: una vez ingresa
 * a {@code BuscarZona}, no abandona el estado en el borde exacto (evitando la oscilacion y traba),
 * sino cuando se halla adentrado de forma segura en la zona.
 */
public class BuscarZona implements EstadoComportamiento {

    private static final double MARGEN_DESENGANCHE_SEGURIDAD = 3.5;
    private static final double DISTANCIA_EXPLORACION = 8.0;
    private static final double[] ANGULOS_ESCAPE = {
            Math.PI / 4.0, -Math.PI / 4.0,
            Math.PI / 2.0, -Math.PI / 2.0,
            Math.PI * 3.0 / 4.0, -Math.PI * 3.0 / 4.0
    };

    @Override
    public EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados) {
        // HISTERESIS DE SEGURIDAD: permanece huyendo del gas hasta estar al menos 3.5u dentro de la zona
        if (contexto.estaSeguroEnZona(MARGEN_DESENGANCHE_SEGURIDAD)) {
            return estados.merodeando();
        }

        Vector2 direccion = direccionDeEscape(contexto);
        if (direccion.longitud() > 1e-6) {
            contexto.aplicarIntencion(direccion, Math.atan2(direccion.getY(), direccion.getX()), false);
        } else {
            Vector2 directa = contexto.direccionHaciaZona();
            contexto.aplicarIntencion(directa, Math.atan2(directa.getY(), directa.getX()), false);
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
