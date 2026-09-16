import { Routes } from '@angular/router';

export const INTERESES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./intereses').then((m) => m.Intereses),
  },
];
