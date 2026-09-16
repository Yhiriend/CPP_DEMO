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
    ],
  },
  { path: '**', redirectTo: '' },
];
