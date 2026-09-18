import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { calcularPorcentajeConcurrencia, calcularValorCuotaParte } from '../../shared/utils/liquidacion';
import LIQUIDACIONES_SEED from '../../fake_data/liquidaciones.json';
import { EntidadesService } from '../entidades/entidades.service';
import { PensionadosService } from '../pensionados/pensionados.service';
import { ConsolidadoLiquidacion, EstadoLiquidacion, Liquidacion, LiquidacionFormValue } from './models/liquidacion.model';

const ESTADO_VARIANT: Record<EstadoLiquidacion, TableBadgeVariant> = {
  Vigente: 'success',
  Procesada: 'info',
  Error: 'danger',
  Borrador: 'warning',
};

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class LiquidacionesService {
  private readonly entidadesService = inject(EntidadesService);
  private readonly pensionadosService = inject(PensionadosService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _liquidaciones = persistedSignal<Liquidacion[]>('liquidaciones', LIQUIDACIONES_SEED as Liquidacion[]);
  readonly liquidaciones = this._liquidaciones.asReadonly();

  private correlativo = this._liquidaciones().length;

  /** HU-002 — genera una liquidación individual aplicando CCAL-001 (% concurrencia) y CCAL-002 (valor cuota parte). */
  generarLiquidacion(value: LiquidacionFormValue): Liquidacion {
    const pensionado = this.pensionadosService.getPensionadoById(value.pensionadoId);
    if (!pensionado) {
      throw new Error(`No existe un pensionado con id ${value.pensionadoId}.`);
    }
    const entidad = this.entidadesService.getEntidadById(pensionado.entidadId);

    const porcentajeConcurrencia = calcularPorcentajeConcurrencia(value.diasEntidad, value.totalDiasPension);
    const capital = calcularValorCuotaParte(value.valorMesadaPensional, porcentajeConcurrencia);

    const nueva: Liquidacion = {
      idLiquidacion: this.nextId(),
      entidadId: pensionado.entidadId,
      entidad: entidad?.nombre ?? pensionado.entidadPrincipal,
      pensionadoId: pensionado.id,
      pensionado: pensionado.nombresApellidos,
      periodo: value.periodo,
      diasEntidad: value.diasEntidad,
      totalDiasPension: value.totalDiasPension,
      porcentajeConcurrencia,
      valorMesadaPensional: value.valorMesadaPensional,
      capital,
      capitalLabel: this.formatCurrency(capital),
      intereses: 0,
      interesesLabel: this.formatCurrency(0),
      estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
    };

    this._liquidaciones.update((list) => [nueva, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Liquidaciones',
      accion: 'Generar',
      entidadAfectada: `Liquidación ${nueva.idLiquidacion} (${nueva.pensionado})`,
      detalle: `Generación de liquidación por ${nueva.capitalLabel} para ${nueva.entidad}, período ${nueva.periodo}.`,
    });
    return nueva;
  }

  /** Cargue masivo de nómina FOPET — genera una liquidación por cada fila válida. */
  bulkGenerar(values: readonly LiquidacionFormValue[]): readonly Liquidacion[] {
    return values.map((value) => this.generarLiquidacion(value));
  }

  /** HU-004 — consolidación de liquidaciones por entidad concurrente (CCAL-003/004). */
  getConsolidadoPorEntidad(): readonly ConsolidadoLiquidacion[] {
    return this.consolidar(
      (liquidacion) => liquidacion.entidadId,
      (liquidacion) => liquidacion.entidad,
    );
  }

  /** HU-005 — consolidación de liquidaciones por pensionado (CCAL-003/004). */
  getConsolidadoPorPensionado(): readonly ConsolidadoLiquidacion[] {
    return this.consolidar(
      (liquidacion) => liquidacion.pensionadoId,
      (liquidacion) => liquidacion.pensionado,
    );
  }

  private consolidar(
    getKey: (liquidacion: Liquidacion) => string,
    getNombre: (liquidacion: Liquidacion) => string,
  ): readonly ConsolidadoLiquidacion[] {
    const grupos = new Map<string, Liquidacion[]>();
    for (const liquidacion of this._liquidaciones()) {
      const key = getKey(liquidacion);
      const grupo = grupos.get(key) ?? [];
      grupo.push(liquidacion);
      grupos.set(key, grupo);
    }

    return Array.from(grupos.entries()).map(([id, liquidacionesGrupo]) => {
      // CCAL-003 — Capital base de cobro = SUMA(Valor cuota parte).
      const capital = liquidacionesGrupo.reduce((sum, l) => sum + l.capital, 0);
      const intereses = liquidacionesGrupo.reduce((sum, l) => sum + l.intereses, 0);
      // CCAL-004 — Valor total = Capital + Intereses.
      const total = capital + intereses;
      return {
        id,
        nombre: getNombre(liquidacionesGrupo[0]),
        cantidadLiquidaciones: liquidacionesGrupo.length,
        capital,
        capitalLabel: this.formatCurrency(capital),
        intereses,
        interesesLabel: this.formatCurrency(intereses),
        total,
        totalLabel: this.formatCurrency(total),
      };
    });
  }

  private nextId(): string {
    this.correlativo += 1;
    return `LQ-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
