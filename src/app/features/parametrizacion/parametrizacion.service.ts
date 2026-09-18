import { Injectable } from '@angular/core';

import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { todayIso } from '../../shared/utils/date';
import DTF_RATES_SEED from '../../fake_data/dtf-rates.json';
import { DtfRate, DtfRateFormValue } from './models/dtf-rate.model';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const SESSION_USER = 'a.garcia@min.gov.co';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class ParametrizacionService {
  private readonly _dtfRates = persistedSignal<DtfRate[]>('dtf-rates', DTF_RATES_SEED as DtfRate[]);
  readonly dtfRates = this._dtfRates.asReadonly();

  /** The DTF rate with the most recent vigencia — used as input for interest calculations. */
  getTasaVigente(): DtfRate | undefined {
    return [...this._dtfRates()].sort((a, b) => b.vigenciaInicial.localeCompare(a.vigenciaInicial))[0];
  }

  registerDtfRate(input: DtfRateFormValue): void {
    const sequence = this._dtfRates().length + 1;
    const [year] = input.vigenciaInicial.split('-');

    const newRate: DtfRate = {
      codigo: `DTF-${year}-${String(sequence).padStart(3, '0')}`,
      periodo: this.buildPeriodo(input.vigenciaInicial),
      vigenciaInicial: input.vigenciaInicial,
      tasa: `${input.tasa.toFixed(2)}%`,
      tasaValor: input.tasa,
      fechaRegistro: todayIso(),
      usuarioResponsable: SESSION_USER,
    };

    this._dtfRates.update((rates) => [newRate, ...rates]);
  }

  updateDtfRate(codigo: string, input: DtfRateFormValue): void {
    this._dtfRates.update((rates) =>
      rates.map((rate) =>
        rate.codigo === codigo
          ? {
              ...rate,
              periodo: this.buildPeriodo(input.vigenciaInicial),
              vigenciaInicial: input.vigenciaInicial,
              tasa: `${input.tasa.toFixed(2)}%`,
              tasaValor: input.tasa,
            }
          : rate,
      ),
    );
  }

  private buildPeriodo(vigenciaInicial: string): string {
    const [year, month] = vigenciaInicial.split('-');
    return `${MONTH_LABELS[Number(month) - 1]} — ${year}`;
  }
}
