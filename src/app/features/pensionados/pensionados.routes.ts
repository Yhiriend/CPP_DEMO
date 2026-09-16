import { Routes } from '@angular/router';

export const PENSIONADOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pensionados').then((m) => m.Pensionados),
  },
];
