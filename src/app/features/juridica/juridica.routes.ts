import { Routes } from '@angular/router';

export const JURIDICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./juridica').then((m) => m.JuridicaPage),
  },
];
