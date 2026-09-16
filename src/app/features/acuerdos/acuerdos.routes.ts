import { Routes } from '@angular/router';

export const ACUERDOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./acuerdos').then((m) => m.Acuerdos),
  },
];
