import { Routes } from '@angular/router';

/** Turnos (cola de espera física) queda fuera de alcance en esta planificación. */
export const AGENDA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./agenda-calendario/agenda-calendario.component').then((m) => m.AgendaCalendarioComponent),
    title: 'Agenda de citas · Citas Médicas',
    data: { help: 'Agenda de citas médicas: crea, confirma y da seguimiento a las citas del día, la semana o el mes.' },
  },
];
