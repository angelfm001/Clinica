import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

export const CLINICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./clinica-home/clinica-home.component').then((m) => m.ClinicaHomeComponent),
    title: 'Clínica · Citas Médicas',
    canActivate: [roleGuard],
    data: { roles: ['Medico'], help: 'Panel clínico: atenciones en curso y búsqueda rápida del expediente de un paciente.' },
  },
  {
    path: 'atencion/:citaId',
    loadComponent: () => import('./atencion/atencion.component').then((m) => m.AtencionComponent),
    title: 'Ficha de atención · Citas Médicas',
    canActivate: [roleGuard],
    data: { roles: ['Medico'], help: 'Ficha de atención médica: motivo de consulta, signos vitales, diagnóstico y notas.' },
  },
  {
    path: 'expediente/:pacienteId',
    loadComponent: () => import('./expediente/expediente.component').then((m) => m.ExpedienteComponent),
    title: 'Expediente clínico · Citas Médicas',
    canActivate: [roleGuard],
    data: {
      roles: ['Medico', 'Administrador'],
      help: 'Expediente clínico del paciente: alergias, antecedentes, hábitos, citas, atenciones y tratamientos.',
    },
  },
];
