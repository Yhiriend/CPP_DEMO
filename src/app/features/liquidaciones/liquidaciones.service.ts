import { Injectable } from '@angular/core';

import { LIQUIDACIONES } from './data/liquidaciones-mock.data';

/** Backed by mock data for now; swap for an HTTP call once the API is ready. */
@Injectable({ providedIn: 'root' })
export class LiquidacionesService {
  getLiquidaciones() {
    return LIQUIDACIONES;
  }
}
