import { Routes } from '@angular/router';

export const LIQUIDACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./liquidaciones').then((m) => m.Liquidaciones),
  },
];
