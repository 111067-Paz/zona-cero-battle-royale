package ar.pazluciano.battleroyale.juego.dominio.bots;

import lombok.Builder;
import lombok.Value;

/**
 * Parametros que definen el "temple" de un bot (value object). Cada arquetipo (asaltante,
 * francotirador, explorador) provee su propia {@code DificultadBot}, y una dificultad global futura
 * podria escalarlos sin tocar la FSM.
 *
 * <p>Los radios vienen en pares con HISTERESIS: se entra a un estado con el radio chico y se sale con
 * el grande, para que un rival en el borde no haga vibrar la maquina de estados.
 */
@Value
@Builder
public class DificultadBot {

    /** Detecta un rival (entra a PERSEGUIR) dentro de este radio. */
    double radioDeteccion;

    /** Deja de perseguir recien mas alla de este radio (> radioDeteccion): histeresis. */
    double radioPerdida;

    /** Entra a ATACAR (rango de tiro) dentro de este radio. */
    double radioAtaque;

    /** Deja de atacar recien mas alla de este radio (> radioAtaque): histeresis. */
    double radioAtaquePerdida;

    /** Ruido de apuntado en radianes: mayor = peor punteria. */
    double precisionAngular;

    /** Ticks de vista continua de un rival antes de reaccionar (no es "ojos laser"). */
    int reaccionTicks;

    /** Rango de ticks entre cambios de rumbo mientras merodea. */
    int ticksRumboMin;
    int ticksRumboMax;
}
