import { Injectable, signal } from '@angular/core';

import { DTF_RATES } from './data/dtf-rates-mock.data';
import { DtfRate } from './models/dtf-rate.model';

export interface NewDtfRateInput {
  readonly tasa: number;
  readonly vigenciaInicial: string;
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Backed by in-memory mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class ParametrizacionService {
  private readonly _dtfRates = signal<DtfRate[]>([...DTF_RATES]);
  readonly dtfRates = this._dtfRates.asReadonly();

  registerDtfRate(input: NewDtfRateInput): void {
    const [year, month] = input.vigenciaInicial.split('-');
    const sequence = this._dtfRates().length + 1;

    const newRate: DtfRate = {
      codigo: `DTF-${year}-${String(sequence).padStart(3, '0')}`,
      periodo: `${MONTH_LABELS[Number(month) - 1]} — ${year}`,
      tasa: `${input.tasa.toFixed(2)}%`,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      usuarioResponsable: 'a.garcia@min.gov.co',
    };

    this._dtfRates.update((rates) => [newRate, ...rates]);
  }
}
