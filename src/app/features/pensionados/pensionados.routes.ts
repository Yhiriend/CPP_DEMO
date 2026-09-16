import { Routes } from '@angular/router';

export const PENSIONADOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pensionados').then((m) => m.Pensionados),
  },
  {
    path: ':id',
    loadComponent: () => import('./pensionado-detail/pensionado-detail').then((m) => m.PensionadoDetail),
  },
];
