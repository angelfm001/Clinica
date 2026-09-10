import { Routes } from '@angular/router';

/** Turnos (cola de espera física) queda fuera de alcance en esta planificación. */
export const AGENDA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./agenda-calendario/agenda-calendario.component').then((m) => m.AgendaCalendarioComponent),
    title: 'Agenda de citas · Citas Médicas',
  },
];
