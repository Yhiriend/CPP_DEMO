import { Injectable } from '@angular/core';

import { CUENTAS_COBRO } from './data/cuentas-cobro-mock.data';

/** Backed by mock data for now; swap for an HTTP call once the API is ready. */
@Injectable({ providedIn: 'root' })
export class CuentasDeCobroService {
  getCuentasCobro() {
    return CUENTAS_COBRO;
  }
}
