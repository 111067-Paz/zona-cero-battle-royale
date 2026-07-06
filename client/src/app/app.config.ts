import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

/**
 * Configuracion raiz de la app. Zoneless (PLAN §7-C, R "zoneless"): el HUD se repinta por signals
 * cuando llega un snapshot o un evento, jamas a 60 fps por zone.js. HttpClient con fetch para la
 * plataforma REST (mapa en F1, auth y ranking en F5).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ],
};
