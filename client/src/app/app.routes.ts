import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { salirPartidaGuard } from './features/partida/salir-partida.guard';

/**
 * Rutas de la app (PLAN §10-F5, Flujo I). Todas lazy: cada bundle (PixiJS, formularios) no pesa en
 * la carga inicial. `/lobby` y `/partida` requieren sesion; `/partida` ademas confirma antes de
 * abandonarla (CanDeactivate).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'lobby',
    loadComponent: () => import('./features/lobby/lobby.page').then((m) => m.LobbyPage),
    canActivate: [authGuard],
  },
  {
    path: 'partida',
    loadComponent: () =>
      import('./features/partida/partida.component').then((m) => m.PartidaComponent),
    canActivate: [authGuard],
    canDeactivate: [salirPartidaGuard],
  },
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },
  { path: '**', redirectTo: 'lobby' },
];
