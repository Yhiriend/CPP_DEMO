import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/layout').then((m) => m.Layout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'acuerdos',
        loadChildren: () => import('./features/acuerdos/acuerdos.routes').then((m) => m.ACUERDOS_ROUTES),
      },
      {
        path: 'parametrizacion',
        loadChildren: () =>
          import('./features/parametrizacion/parametrizacion.routes').then((m) => m.PARAMETRIZACION_ROUTES),
      },
      {
        path: 'entidades',
        loadChildren: () => import('./features/entidades/entidades.routes').then((m) => m.ENTIDADES_ROUTES),
      },
      {
        path: 'cartera',
        loadChildren: () => import('./features/cartera/cartera.routes').then((m) => m.CARTERA_ROUTES),
      },
      {
        path: 'pagos',
        loadChildren: () => import('./features/pagos/pagos.routes').then((m) => m.PAGOS_ROUTES),
      },
      {
        path: 'liquidaciones',
        loadChildren: () =>
          import('./features/liquidaciones/liquidaciones.routes').then((m) => m.LIQUIDACIONES_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
