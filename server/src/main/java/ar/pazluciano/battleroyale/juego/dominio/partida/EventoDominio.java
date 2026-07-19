package ar.pazluciano.battleroyale.juego.dominio.partida;

/**
 * Hecho puntual que el cliente no debe "descubrir" comparando snapshots (PLAN §5.2): viaja como
 * {@code EVENTO}, SEPARADO del snapshot y DESPUES de el (R22). Conjunto cerrado a proposito: permite
 * al motor despachar con un switch exhaustivo (sin {@code default}) al traducir a wire.
 *
 * <p>Mismo estilo que {@code Comando} y {@code MensajeCliente}: sellado. Sin {@code module-info.java}
 * (modulo sin nombre), Java exige que TODAS las clases permitidas esten en el MISMO PAQUETE que la
 * interfaz sellada — por eso {@code EventoKill} vive aca y no en {@code dominio.combate}.
 */
public sealed interface EventoDominio
        permits EventoKill, EventoRecogido, EventoMuerteZona, EventoFinPartida, EventoImpacto {
}
