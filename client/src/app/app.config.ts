import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

/**
 * Configuracion raiz de la app. Zoneless (PLAN §7-C, R "zoneless"): el HUD se repinta por signals
 * cuando llega un snapshot o un evento, jamas a 60 fps por zone.js. HttpClient con fetch para la
 * plataforma REST (mapa, auth, ranking), con el interceptor de Bearer/refresh de la Fase 5.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
