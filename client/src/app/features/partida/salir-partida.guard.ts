import { CanDeactivateFn } from '@angular/router';
import { PartidaComponent } from './partida.component';

/**
 * Confirma antes de abandonar `/partida` (F5): una navegacion accidental (back del navegador,
 * click en un link) no debe tirar a un jugador VIVO fuera de la partida sin avisarle.
 */
export const salirPartidaGuard: CanDeactivateFn<PartidaComponent> = () =>
  confirm('Seguro que queres abandonar la partida?');
