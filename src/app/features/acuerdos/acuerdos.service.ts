import { Injectable } from '@angular/core';

import { ACUERDOS } from './data/acuerdos-mock.data';

/** Backed by mock data for now; swap the body for an HTTP call once the API is ready. */
@Injectable({ providedIn: 'root' })
export class AcuerdosService {
  getAcuerdos() {
    return ACUERDOS;
  }
}
