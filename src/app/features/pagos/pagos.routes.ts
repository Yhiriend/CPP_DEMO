import { Routes } from '@angular/router';

export const PAGOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pagos').then((m) => m.Pagos),
  },
];
