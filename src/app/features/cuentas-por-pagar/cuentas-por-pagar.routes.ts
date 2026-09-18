import { Routes } from '@angular/router';

export const CUENTAS_POR_PAGAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cuentas-por-pagar').then((m) => m.CuentasPorPagar),
  },
];
