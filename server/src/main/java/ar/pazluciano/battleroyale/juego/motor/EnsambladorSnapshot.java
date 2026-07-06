package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.juego.dominio.combate.Proyectil;
import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Partida;
import ar.pazluciano.battleroyale.juego.protocolo.JugadorSnapshot;
import ar.pazluciano.battleroyale.juego.protocolo.ProyectilSnapshot;
import ar.pazluciano.battleroyale.juego.protocolo.Snapshot;

import java.util.ArrayList;
import java.util.List;

/**
 * Traduce el estado vivo de una {@link Partida} a un {@link Snapshot} del protocolo.
 *
 * <p>Es la frontera dominio -> wire y el punto donde se cumple R14: cada campo se COPIA por valor,
 * nunca se referencia el objeto vivo del dominio ni el proyectil en vuelo. Como corre dentro del tick
 * (hilo del loop), lee un estado consistente.
 */
public class EnsambladorSnapshot {

    public Snapshot desde(Partida partida) {
        List<JugadorSnapshot> jugadores = new ArrayList<>();
        for (Jugador jugador : partida.jugadoresVisibles()) {
            jugadores.add(copiar(jugador));
        }
        List<ProyectilSnapshot> proyectiles = new ArrayList<>();
        for (Proyectil proyectil : partida.proyectilesVisibles()) {
            proyectiles.add(copiar(proyectil));
        }
        return Snapshot.builder()
                .tick(partida.getTick())
                .estado(partida.getEstado())
                .tickInicio(partida.getTickInicio())
                .acks(partida.acks())
                .jugadores(jugadores)
                .proyectiles(proyectiles)
                .build();
    }

    private JugadorSnapshot copiar(Jugador jugador) {
        return JugadorSnapshot.builder()
                .id(jugador.getId())
                .x(jugador.getPosicion().getX())
                .y(jugador.getPosicion().getY())
                .angulo(jugador.getAngulo())
                .hp(jugador.getHp())
                .estadoVida(jugador.getEstadoVida())
                .conectado(jugador.isConectado())
                .arma(jugador.getArma().tipo())
                .kills(jugador.getKills())
                .build();
    }

    private ProyectilSnapshot copiar(Proyectil proyectil) {
        return ProyectilSnapshot.builder()
                .id(proyectil.getIdRed())
                .x(proyectil.getPosicion().getX())
                .y(proyectil.getPosicion().getY())
                .angulo(proyectil.angulo())
                .build();
    }
}
