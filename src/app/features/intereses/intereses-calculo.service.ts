import { Injectable, inject } from '@angular/core';

import { ParametrizacionService } from '../parametrizacion/parametrizacion.service';
import { calcularDiasMora, calcularInteresMora } from '../../shared/utils/interes';
import { todayIso } from '../../shared/utils/date';

export interface CalculoInteres {
  readonly diasMora: number;
  readonly tasaDtfAplicada: number;
  readonly interes: number;
  readonly interesLabel: string;
}

/**
 * Orchestrates HU-008/HU-009: aplica el histórico de tasas DTF (owned by
 * Parametrización) a un capital y su fecha base de mora, per CCAL-006/CCAL-007.
 * Pure math lives in shared/utils/interes; this service only adds the "which
 * DTF rate(s) apply" lookup — el período de mora puede tocar varios meses,
 * cada uno con su propia tasa vigente.
 */
@Injectable({ providedIn: 'root' })
export class InteresesCalculoService {
  private readonly parametrizacionService = inject(ParametrizacionService);

  calcular(capital: number, fechaBaseMora: string, fechaCorte: string = todayIso()): CalculoInteres {
    const tasasDtf = this.parametrizacionService.dtfRates();
    const diasMora = calcularDiasMora(fechaBaseMora, fechaCorte);
    const interes = calcularInteresMora(capital, tasasDtf, fechaBaseMora, fechaCorte);
    const tasaDtfAplicada = this.parametrizacionService.getTasaVigente()?.tasaValor ?? 0;

    return {
      diasMora,
      tasaDtfAplicada,
      interes,
      interesLabel: `$${interes.toLocaleString('en-US')}`,
    };
  }
}
