import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'info',
    loadComponent: () => import('./features/info/info.component').then((m) => m.InfoComponent),
    title: 'Información · Citas Médicas',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar sesión · Citas Médicas',
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Inicio · Citas Médicas',
      },
      {
        path: 'pacientes',
        loadChildren: () => import('./features/pacientes/pacientes.routes').then((m) => m.PACIENTES_ROUTES),
      },
      {
        path: 'agenda',
        loadChildren: () => import('./features/agenda/agenda.routes').then((m) => m.AGENDA_ROUTES),
      },
      {
        path: 'staff',
        canActivate: [roleGuard],
        data: { roles: ['Administrador', 'Recepcion'] },
        loadChildren: () => import('./features/staff/staff.routes').then((m) => m.STAFF_ROUTES),
      },
      {
        path: 'clinica',
        canActivate: [roleGuard],
        data: { roles: ['Medico', 'Administrador'] },
        loadChildren: () => import('./features/clinica/clinica.routes').then((m) => m.CLINICA_ROUTES),
      },
      {
        path: 'tratamientos',
        canActivate: [roleGuard],
        data: { roles: ['Medico', 'Administrador'] },
        loadChildren: () => import('./features/tratamientos/tratamientos.routes').then((m) => m.TRATAMIENTOS_ROUTES),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
        title: 'Reportes · Citas Médicas',
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['Administrador'] },
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil.component').then((m) => m.PerfilComponent),
        title: 'Mi perfil · Citas Médicas',
      },
      { path: '**', redirectTo: 'inicio' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
