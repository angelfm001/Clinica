import { Routes } from '@angular/router';

export const STAFF_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./staff-shell/staff-shell.component').then((m) => m.StaffShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'medicos' },
      {
        path: 'medicos',
        loadComponent: () => import('./medicos-list/medicos-list.component').then((m) => m.MedicosListComponent),
        title: 'Médicos · Citas Médicas',
      },
      {
        path: 'especialidades',
        loadComponent: () => import('./especialidades-list/especialidades-list.component').then((m) => m.EspecialidadesListComponent),
        title: 'Especialidades · Citas Médicas',
      },
      {
        path: 'consultorios',
        loadComponent: () => import('./consultorios-list/consultorios-list.component').then((m) => m.ConsultoriosListComponent),
        title: 'Consultorios · Citas Médicas',
      },
    ],
  },
  {
    path: 'medicos/:id/horarios',
    loadComponent: () => import('./horarios/horarios.component').then((m) => m.HorariosComponent),
    title: 'Horarios del médico · Citas Médicas',
  },
];
