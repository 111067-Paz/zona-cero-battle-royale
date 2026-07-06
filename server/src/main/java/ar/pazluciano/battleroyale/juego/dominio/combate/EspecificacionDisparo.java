package ar.pazluciano.battleroyale.juego.dominio.combate;

import lombok.Builder;
import lombok.Value;

/**
 * "Plano" de un proyectil que produce un {@link Arma} al disparar: direccion, velocidad y dano. La
 * {@link ar.pazluciano.battleroyale.juego.dominio.partida.Partida} lo materializa en un
 * {@code Proyectil} con su {@code idRed} nuevo. Separar el plano del proyectil mantiene al arma
 * ignorante del pool y del contador de ids.
 */
@Value
@Builder
public class EspecificacionDisparo {

    /** Angulo de la trayectoria en radianes (ya con la dispersion aplicada, si el arma la tiene). */
    double angulo;

    /** Velocidad del proyectil, en unidades por segundo. */
    double velocidad;

    /** Dano que inflige el impacto. */
    int dano;
}
