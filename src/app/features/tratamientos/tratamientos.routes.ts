import { Routes } from '@angular/router';

export const TRATAMIENTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./medicamentos-list/medicamentos-list.component').then((m) => m.MedicamentosListComponent),
    title: 'Tratamientos · Citas Médicas',
  },
  {
    path: 'prescripcion/nueva',
    loadComponent: () => import('./prescripcion-nueva/prescripcion-nueva.component').then((m) => m.PrescripcionNuevaComponent),
    title: 'Nueva prescripción · Citas Médicas',
  },
];
