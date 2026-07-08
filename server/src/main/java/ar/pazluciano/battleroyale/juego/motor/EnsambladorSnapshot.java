package ar.pazluciano.battleroyale.juego.motor;

import ar.pazluciano.battleroyale.juego.dominio.botin.Botin;
import ar.pazluciano.battleroyale.juego.dominio.combate.Proyectil;
import ar.pazluciano.battleroyale.juego.dominio.partida.Jugador;
import ar.pazluciano.battleroyale.juego.dominio.partida.Partida;
import ar.pazluciano.battleroyale.juego.dominio.partida.ZonaSegura;
import ar.pazluciano.battleroyale.juego.protocolo.BotinSnapshot;
import ar.pazluciano.battleroyale.juego.protocolo.JugadorSnapshot;
import ar.pazluciano.battleroyale.juego.protocolo.ProyectilSnapshot;
import ar.pazluciano.battleroyale.juego.protocolo.Snapshot;
import ar.pazluciano.battleroyale.juego.protocolo.ZonaSnapshot;

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
        List<BotinSnapshot> botines = new ArrayList<>();
        for (Botin botin : partida.botinesVisibles()) {
            if (botin.isDisponible()) {
                botines.add(copiar(botin));
            }
        }
        return Snapshot.builder()
                .tick(partida.getTick())
                .estado(partida.getEstado())
                .tickInicio(partida.getTickInicio())
                .ticksParaInicio(partida.ticksParaInicio().orElse(null))
                .acks(partida.acks())
                .jugadores(jugadores)
                .proyectiles(proyectiles)
                .zona(copiar(partida.getZona()))
                .botines(botines)
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
                .botiquines(jugador.getBotiquines())
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

    private BotinSnapshot copiar(Botin botin) {
        return BotinSnapshot.builder()
                .id(botin.getId())
                .tipo(botin.getTipo().name())
                .x(botin.getPosicion().getX())
                .y(botin.getPosicion().getY())
                .build();
    }

    /** Nulo hasta que la partida entra EN_CURSO (la zona todavia no existe). */
    private ZonaSnapshot copiar(ZonaSegura zona) {
        if (zona == null) {
            return null;
        }
        return ZonaSnapshot.builder()
                .cx(zona.getCentro().getX())
                .cy(zona.getCentro().getY())
                .radio(zona.getRadio())
                .fase(zona.getFase())
                .radioProximo(zona.radioProximo())
                .ticksParaProximoCambio(zona.ticksParaProximoCambio())
                .build();
    }
}
