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
 * Orchestrates HU-008/HU-009: applies the DTF rate currently in force
 * (owned by Parametrización) to a capital balance and its mora start
 * date, per CCAL-006/CCAL-007. Pure math lives in shared/utils/interes;
 * this service only adds the "which DTF rate applies" lookup.
 */
@Injectable({ providedIn: 'root' })
export class InteresesCalculoService {
  private readonly parametrizacionService = inject(ParametrizacionService);

  calcular(capital: number, fechaBaseMora: string, fechaCorte: string = todayIso()): CalculoInteres {
    const tasaVigente = this.parametrizacionService.getTasaVigente();
    const tasaDtfAplicada = tasaVigente?.tasaValor ?? 0;
    const diasMora = calcularDiasMora(fechaBaseMora, fechaCorte);
    const interes = calcularInteresMora(capital, tasaDtfAplicada, diasMora);

    return {
      diasMora,
      tasaDtfAplicada,
      interes,
      interesLabel: `$${interes.toLocaleString('en-US')}`,
    };
  }
}
