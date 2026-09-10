import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolNombre } from '../models/security.model';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Oculta/bloquea rutas según el rol del usuario autenticado.
 * Uso: `data: { roles: ['Medico', 'Administrador'] }` en la definición de ruta.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const roles = (route.data?.['roles'] as RolNombre[] | undefined) ?? [];
  if (roles.length === 0 || auth.hasRol(...roles)) return true;

  toast.warning('Tu rol no tiene acceso a esa sección.');
  return router.createUrlTree(['/inicio']);
};
