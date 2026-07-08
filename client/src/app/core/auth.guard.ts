import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Protege `/lobby` y `/partida`: sin sesion, redirige a `/login` (PLAN §10-F5). */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.estaAutenticado() ? true : router.createUrlTree(['/login']);
};
