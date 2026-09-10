import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { mockBackendInterceptor } from './core/mock/mock-backend.interceptor';

/**
 * El interceptor mock solo se registra en desarrollo (`useMock: true`). Para
 * conectar la interfaz a los microservicios reales basta con poner
 * `useMock: false` en `environment.ts`: ningún componente ni servicio cambia.
 */
const interceptors: HttpInterceptorFn[] = environment.useMock
  ? [authInterceptor, mockBackendInterceptor, errorInterceptor]
  : [authInterceptor, errorInterceptor];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors(interceptors)),
  ],
};
