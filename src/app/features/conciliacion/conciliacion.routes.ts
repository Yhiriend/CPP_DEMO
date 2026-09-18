import { Routes } from '@angular/router';

export const CONCILIACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./conciliacion').then((m) => m.ConciliacionPage),
  },
];
