import { Injectable } from '@angular/core';

import { CARTERA_KPIS, CARTERA_POR_ENTIDAD } from './data/cartera-mock.data';

/** Backed by mock data for now; swap for an HTTP call once the API is ready. */
@Injectable({ providedIn: 'root' })
export class CarteraService {
  getKpis() {
    return CARTERA_KPIS;
  }

  getCarteraPorEntidad() {
    return CARTERA_POR_ENTIDAD;
  }
}
