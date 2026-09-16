import { Routes } from '@angular/router';

export const CUENTAS_DE_COBRO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cuentas-de-cobro').then((m) => m.CuentasDeCobro),
  },
];
