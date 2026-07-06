package ar.pazluciano.battleroyale.juego.motor;

/**
 * Comando encolado hacia el loop de una partida (patron Command, PLAN §2.4/§6). Los hilos de red
 * solo parsean, validan forma y ENCOLAN comandos; el loop los drena y ejecuta. Ningun comando muta
 * la partida por si mismo: el loop los traduce a llamadas del dominio.
 *
 * <p>Interfaz sellada: el conjunto de comandos es cerrado y conocido, lo que permite despacharlos con
 * un switch exhaustivo (sin {@code default}) en el loop.
 */
public sealed interface Comando
        permits ComandoUnirse, ComandoInput, ComandoSalir, ComandoDesconexion {
}
