package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;

import java.util.Optional;

/**
 * Rival detectado pero fuera de rango de tiro: el bot se acerca apuntandole, sin disparar todavia.
 * Usa el radio de PERDIDA (mayor que el de deteccion) para seguir persiguiendo — histeresis que evita
 * el parpadeo cuando el rival esta en el borde. Entra a ATACAR al alcanzar el radio de ataque; vuelve
 * a MERODEAR si pierde al rival (fuera de rango o sin linea de vista).
 */
public class Persiguiendo implements EstadoComportamiento {

    @Override
    public EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados) {
        DificultadBot dificultad = contexto.getDificultad();
        Optional<Jugador> rival = contexto.rivalVisible(dificultad.getRadioPerdida());
        if (rival.isEmpty()) {
            return estados.merodeando();
        }
        Jugador objetivo = rival.get();
        contexto.aplicarIntencion(contexto.direccionHacia(objetivo), contexto.anguloHacia(objetivo), false);
        if (contexto.distanciaA(objetivo) <= dificultad.getRadioAtaque()) {
            return estados.atacando();
        }
        return this;
    }
}
