import { Routes } from '@angular/router';

export const CLINICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./clinica-home/clinica-home.component').then((m) => m.ClinicaHomeComponent),
    title: 'Clínica · Citas Médicas',
  },
  {
    path: 'atencion/:citaId',
    loadComponent: () => import('./atencion/atencion.component').then((m) => m.AtencionComponent),
    title: 'Ficha de atención · Citas Médicas',
  },
  {
    path: 'expediente/:pacienteId',
    loadComponent: () => import('./expediente/expediente.component').then((m) => m.ExpedienteComponent),
    title: 'Expediente clínico · Citas Médicas',
  },
];
