import { Routes } from '@angular/router';

/**
 * Rutas de la app. Fase 0: se entra directo a `/partida` (el "circulo que se mueve"). El menu
 * `/lobby`, login y registro llegan en la Fase 5 (PLAN Flujo I). La ruta de partida es lazy: su
 * bundle (PixiJS incluido) no pesa en la carga inicial.
 */
export const routes: Routes = [
  {
    path: 'partida',
    loadComponent: () =>
      import('./features/partida/partida.component').then((m) => m.PartidaComponent),
  },
  { path: '', redirectTo: 'partida', pathMatch: 'full' },
  { path: '**', redirectTo: 'partida' },
];
