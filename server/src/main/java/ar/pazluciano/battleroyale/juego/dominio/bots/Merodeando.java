package ar.pazluciano.battleroyale.juego.dominio.bots;

import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Vector2;

import java.util.Optional;

/**
 * Sin rival a la vista: el bot camina en una direccion aleatoria (determinista, del RNG de la
 * partida) que cambia cada tantos ticks. Cuando ve un rival de forma CONTINUA por
 * {@code reaccionTicks}, transiciona a PERSEGUIR (reaccion no instantanea, mas humana).
 */
public class Merodeando implements EstadoComportamiento {

    @Override
    public EstadoComportamiento actuar(ContextoBot contexto, RepertorioEstados estados) {
        DificultadBot dificultad = contexto.getDificultad();
        MemoriaBot memoria = contexto.getMemoria();
        Optional<Jugador> rival = contexto.rivalVisible(dificultad.getRadioDeteccion());

        if (rival.isPresent()) {
            memoria.setReaccionRestante(memoria.getReaccionRestante() - 1);
            if (memoria.getReaccionRestante() <= 0) {
                memoria.setReaccionRestante(dificultad.getReaccionTicks());
                return estados.persiguiendo();
            }
        } else {
            memoria.setReaccionRestante(dificultad.getReaccionTicks());
        }

        merodear(contexto, memoria, dificultad);
        return this;
    }

    private void merodear(ContextoBot contexto, MemoriaBot memoria, DificultadBot dificultad) {
        if (memoria.getTicksHastaCambioRumbo() <= 0) {
            double angulo = contexto.getRng().nextDouble() * 2.0 * Math.PI;
            memoria.setDireccionMerodeo(new Vector2(Math.cos(angulo), Math.sin(angulo)));
            int amplitud = Math.max(1, dificultad.getTicksRumboMax() - dificultad.getTicksRumboMin());
            memoria.setTicksHastaCambioRumbo(dificultad.getTicksRumboMin() + contexto.getRng().nextInt(amplitud));
        } else {
            memoria.setTicksHastaCambioRumbo(memoria.getTicksHastaCambioRumbo() - 1);
        }
        Vector2 rumbo = memoria.getDireccionMerodeo();
        contexto.aplicarIntencion(rumbo, Math.atan2(rumbo.getY(), rumbo.getX()), false);
    }
}
