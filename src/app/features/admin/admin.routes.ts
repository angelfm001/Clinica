import { Routes } from '@angular/router';

/**
 * Administración reducida: solo Usuarios (con su Rol) y Configuración.
 * Roles/Permisos y Auditoría quedan fuera de alcance en esta planificación.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'usuarios',
    loadComponent: () => import('./usuarios-list/usuarios-list.component').then((m) => m.UsuariosListComponent),
    title: 'Usuarios y Roles · Citas Médicas',
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
    title: 'Configuración · Citas Médicas',
  },
];
