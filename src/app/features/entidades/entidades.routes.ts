import { Routes } from '@angular/router';

export const ENTIDADES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./entidades-list/entidades-list').then((m) => m.EntidadesList),
  },
  {
    path: ':id',
    loadComponent: () => import('./entidad-detail/entidad-detail').then((m) => m.EntidadDetail),
  },
];
