import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { EstadoPartidaStore } from './estado-partida.store';
import { PartidaComponent } from './partida.component';

/**
 * Confirma antes de abandonar `/partida` (F5): una navegacion accidental (back del navegador,
 * click en un link) no debe tirar a un jugador VIVO fuera de la partida sin avisarle. Excepcion:
 * si la partida YA TERMINO (podio visible) no hay nada que perder — dejar salir sin preguntar,
 * si no el boton VOLVER AL LOBBY y el redirect automatico del podio quedarian bloqueados.
 */
export const salirPartidaGuard: CanDeactivateFn<PartidaComponent> = () => {
  const store = inject(EstadoPartidaStore);
  const terminada = store.resultadoFinal() !== null || store.ultimoSnapshot()?.estado === 'FINALIZADA';
  return terminada ? true : confirm('Seguro que queres abandonar la partida?');
};
