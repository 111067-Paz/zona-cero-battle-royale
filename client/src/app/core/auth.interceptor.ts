import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const RUTAS_SIN_TOKEN = ['/api/auth/register', '/api/auth/login', '/api/auth/refresh'];

/**
 * Agrega el Bearer a cada request de la plataforma y, si el server responde 401 por un access
 * token vencido, intenta UN refresh y reintenta la request original (PLAN §10-F5). Si el refresh
 * tambien falla, cierra la sesion local y deja que el guard redirija en la proxima navegacion.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const esRutaPublica = RUTAS_SIN_TOKEN.some((ruta) => request.url.startsWith(ruta));
  const accessToken = authService.accessTokenActual();
  const requestConToken =
    !esRutaPublica && accessToken !== null
      ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : request;

  return next(requestConToken).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || esRutaPublica) {
        return throwError(() => error);
      }
      return authService.refresh().pipe(
        switchMap((respuesta) => {
          const reintento = request.clone({
            setHeaders: { Authorization: `Bearer ${respuesta.accessToken}` },
          });
          return next(reintento);
        }),
        catchError((errorRefresh: unknown) => {
          authService.notificarSesionExpirada();
          router.navigate(['/login']);
          return throwError(() => errorRefresh);
        }),
      );
    }),
  );
};
