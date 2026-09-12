import { Routes } from '@angular/router';

export const CLINICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./clinica-home/clinica-home.component').then((m) => m.ClinicaHomeComponent),
    title: 'Clínica · Citas Médicas',
    data: { help: 'Panel clínico: atenciones en curso y búsqueda rápida del expediente de un paciente.' },
  },
  {
    path: 'atencion/:citaId',
    loadComponent: () => import('./atencion/atencion.component').then((m) => m.AtencionComponent),
    title: 'Ficha de atención · Citas Médicas',
    data: { help: 'Ficha de atención médica: motivo de consulta, signos vitales, diagnóstico y notas.' },
  },
  {
    path: 'expediente/:pacienteId',
    loadComponent: () => import('./expediente/expediente.component').then((m) => m.ExpedienteComponent),
    title: 'Expediente clínico · Citas Médicas',
    data: { help: 'Expediente clínico del paciente: historial de atenciones y prescripciones emitidas.' },
  },
];
