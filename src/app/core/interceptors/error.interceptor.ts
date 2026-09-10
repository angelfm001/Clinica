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
        toast.error('Ocurrió un error en el servidor. Intenta nuevamente.');
      } else {
        const detail = (error.error?.detail || error.error?.title || error.message) as string | undefined;
        toast.error(detail ?? 'Ocurrió un error al procesar la solicitud.');
      }
      void auth;
      return throwError(() => error);
    }),
  );
};
