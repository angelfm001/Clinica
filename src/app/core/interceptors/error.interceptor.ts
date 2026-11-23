import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Traduce errores HTTP a toasts legibles y gestiona el 401 global (sesión
 * expirada / token inválido), sin que cada componente tenga que repetir esa
 * lógica.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const auth = inject(AuthService);

  // El login maneja sus propios errores (un 401 ahí son credenciales inválidas, no una sesión expirada).
  if (req.url.endsWith('/auth/login')) return next(req);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        toast.error('Tu sesión expiró. Inicia sesión nuevamente.');
        sessionStorage.removeItem('cm.session');
        router.navigateByUrl('/login');
      } else if (error.status === 403) {
        toast.error('No tienes permisos para realizar esta acción.');
      } else if (error.status === 0) {
        toast.error('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else if (error.status >= 500) {
        toast.error(error.error?.errorMessage ?? 'Ocurrió un error en el servidor. Intenta nuevamente.');
      } else {
        // Los microservicios responden con el sobre HttpResponse (errorMessage) o con ProblemDetails (detail / errors).
        const body = error.error;
        const validacion = body?.errors ? (Object.values(body.errors).flat() as string[]).join(' ') : '';
        const detail = (body?.errorMessage || body?.detail || validacion || body?.title || error.message) as string | undefined;
        toast.error(detail ?? 'Ocurrió un error al procesar la solicitud.');
      }
      void auth;
      return throwError(() => error);
    }),
  );
};
