import { Routes } from '@angular/router';

export const CARTERA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cartera').then((m) => m.Cartera),
  },
];
