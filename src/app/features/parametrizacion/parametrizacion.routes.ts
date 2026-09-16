import { Routes } from '@angular/router';

export const PARAMETRIZACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./parametrizacion').then((m) => m.Parametrizacion),
  },
];
