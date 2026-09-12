import { Routes } from '@angular/router';

export const TRATAMIENTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./medicamentos-list/medicamentos-list.component').then((m) => m.MedicamentosListComponent),
    title: 'Tratamientos · Citas Médicas',
    data: { help: 'Catálogo de medicamentos disponibles para prescripción.' },
  },
  {
    path: 'prescripcion/nueva',
    loadComponent: () => import('./prescripcion-nueva/prescripcion-nueva.component').then((m) => m.PrescripcionNuevaComponent),
    title: 'Nueva prescripción · Citas Médicas',
    data: { help: 'Genera una receta médica con uno o varios medicamentos para la atención en curso.' },
  },
];
