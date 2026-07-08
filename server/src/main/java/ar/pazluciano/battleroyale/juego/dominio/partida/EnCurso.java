package ar.pazluciano.battleroyale.juego.dominio.partida;

import java.util.Optional;

/**
 * La partida jugable: delega en {@code Partida.ejecutarTickJugable()} todo lo que ya conociamos
 * (mover, disparar, zona, botin) y evalua la condicion de victoria cada tick. Al haber un resultado,
 * dispara {@code Partida.finalizar(...)} y transiciona a {@link Finalizada}.
 */
public class EnCurso implements EstadoDePartida {

    @Override
    public EstadoDePartida procesarTick(Partida partida) {
        partida.ejecutarTickJugable();
        Optional<ResultadoFinal> resultado = partida.evaluarVictoria();
        if (resultado.isPresent()) {
            partida.finalizar(resultado.get());
            return new Finalizada();
        }
        return this;
    }

    @Override
    public EstadoPartida tipo() {
        return EstadoPartida.EN_CURSO;
    }
}
