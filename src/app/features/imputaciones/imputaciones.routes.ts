import { Routes } from '@angular/router';

export const IMPUTACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./imputaciones').then((m) => m.Imputaciones),
  },
];
