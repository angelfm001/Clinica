import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pacientes-list/pacientes-list.component').then((m) => m.PacientesListComponent),
    title: 'Pacientes · Citas Médicas',
  },
  {
    path: ':id',
    loadComponent: () => import('./paciente-detalle/paciente-detalle.component').then((m) => m.PacienteDetalleComponent),
    title: 'Detalle de paciente · Citas Médicas',
  },
];
