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
        data: { help: 'Gestiona el personal médico: especialidad, licencia y datos de contacto.' },
      },
      {
        path: 'especialidades',
        loadComponent: () => import('./especialidades-list/especialidades-list.component').then((m) => m.EspecialidadesListComponent),
        title: 'Especialidades · Citas Médicas',
        data: { help: 'Catálogo de especialidades médicas disponibles en la clínica.' },
      },
      {
        path: 'consultorios',
        loadComponent: () => import('./consultorios-list/consultorios-list.component').then((m) => m.ConsultoriosListComponent),
        title: 'Consultorios · Citas Médicas',
        data: { help: 'Catálogo de consultorios y espacios físicos de atención.' },
      },
    ],
  },
  {
    path: 'medicos/:id/horarios',
    loadComponent: () => import('./horarios/horarios.component').then((m) => m.HorariosComponent),
    title: 'Horarios del médico · Citas Médicas',
    data: { help: 'Configura la disponibilidad semanal del médico: días, horas y consultorio.' },
  },
];
