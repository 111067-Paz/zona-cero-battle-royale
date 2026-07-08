package ar.pazluciano.battleroyale.juego.dominio.partida;

import lombok.Builder;
import lombok.Value;

/**
 * Cronograma de la zona segura (PLAN §7-E). Value object del dominio, derivado de la config del
 * framework: radios y tiempos configurables (nada hardcodeado), asi el ritmo de una partida se ajusta
 * sin tocar codigo.
 */
@Value
@Builder
public class ParametrosZona {

    /** Radio de la zona al arrancar EN_CURSO. */
    double radioInicial;

    /** Radio final, al cabo de todas las contracciones. */
    double radioMinimo;

    /** Cantidad de contracciones hasta llegar al radio minimo. */
    int cantidadFases;

    /** Ticks que dura CADA contraccion (radio interpolando). */
    int ticksContraccion;

    /** Ticks de espera entre el fin de una contraccion y el aviso/inicio de la siguiente. */
    int ticksEspera;

    /** Dano por segundo a quien esta fuera del circulo. Se aplica con acumulador fraccional (§7-E). */
    double danioPorSegundo;
}
