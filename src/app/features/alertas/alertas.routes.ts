import { Routes } from '@angular/router';

export const ALERTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./alertas').then((m) => m.Alertas),
  },
];
