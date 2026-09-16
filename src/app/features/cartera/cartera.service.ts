import { Injectable, inject } from '@angular/core';

import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { TableBadge } from '../../shared/ui/table/table.model';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { CuentaCobro } from '../cuentas-de-cobro/models/cuenta-cobro.model';
import { ImputacionesService } from '../imputaciones/imputaciones.service';
import { ParametrizacionService } from '../parametrizacion/parametrizacion.service';
import { CarteraPorEntidad, CarteraPorPensionado, MovimientoCartera, ObligacionCarteraRow } from './models/cartera.model';

const PAGADA_BADGE: TableBadge = { label: 'Pagada', variant: 'success' };

/**
 * HU-006/HU-007 — vista de solo lectura sobre la cartera derivada de las cuentas de
 * cobro (Fase 4) y sus imputaciones (Fase 5/6). No mantiene estado propio: toda la
 * información se deriva en vivo de CuentasDeCobroService/ImputacionesService, igual
 * que el resto del sistema desde la Fase 2.
 */
@Injectable({ providedIn: 'root' })
export class CarteraService {
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly parametrizacionService = inject(ParametrizacionService);

  private cuentasVigentes(): readonly CuentaCobro[] {
    return this.cuentasDeCobroService.cuentasCobro().filter((c) => c.estado.label !== 'Anulada');
  }

  getObligaciones(): readonly ObligacionCarteraRow[] {
    return this.cuentasVigentes().map((cuenta) => this.toRow(cuenta));
  }

  getCarteraVencida(): readonly ObligacionCarteraRow[] {
    return this.getObligaciones().filter((o) => o.estado.label === 'Vencida');
  }

  getKpis(): readonly StatCardData[] {
    const obligaciones = this.getObligaciones();
    const capital = obligaciones.reduce((sum, o) => sum + o.capital, 0);
    const intereses = obligaciones.reduce((sum, o) => sum + o.intereses, 0);
    const saldoPendiente = obligaciones.reduce((sum, o) => sum + o.saldoTotal, 0);
    const pendientes = obligaciones.filter((o) => o.saldoTotal > 0).length;

    return [
      { label: 'Cartera Total Vigente', value: this.formatCurrency(capital), subtitle: `${obligaciones.length} obligaciones` },
      { label: 'Total Intereses (CCAL-008)', value: this.formatCurrency(intereses), subtitle: 'Calculado en vivo' },
      { label: 'Deuda Total Consolidada', value: this.formatCurrency(capital + intereses), subtitle: 'Capital + intereses' },
      { label: 'Saldo Pendiente', value: this.formatCurrency(saldoPendiente), subtitle: `${pendientes} obligaciones abiertas` },
    ];
  }

  getCarteraPorEntidad(): readonly CarteraPorEntidad[] {
    const grupos = new Map<string, ObligacionCarteraRow[]>();
    for (const obligacion of this.getObligaciones()) {
      const grupo = grupos.get(obligacion.entidadId) ?? [];
      grupo.push(obligacion);
      grupos.set(obligacion.entidadId, grupo);
    }

    return Array.from(grupos.entries()).map(([entidadId, obligaciones]) => {
      const capital = obligaciones.reduce((sum, o) => sum + o.capital, 0);
      const intereses = obligaciones.reduce((sum, o) => sum + o.intereses, 0);
      const saldoTotal = obligaciones.reduce((sum, o) => sum + o.saldoTotal, 0);
      const total = capital + intereses;
      const cobertura = total > 0 ? Math.round(((total - saldoTotal) / total) * 100) : 0;

      return {
        entidadId,
        entidad: obligaciones[0].entidad,
        obligacionesPendientes: obligaciones.filter((o) => o.saldoTotal > 0).length,
        capital,
        capitalLabel: this.formatCurrency(capital),
        intereses,
        interesesLabel: this.formatCurrency(intereses),
        saldoTotal,
        saldoTotalLabel: this.formatCurrency(saldoTotal),
        cobertura: { percentage: cobertura },
      };
    });
  }

  getCarteraPorPensionado(): readonly CarteraPorPensionado[] {
    const grupos = new Map<string, { entidad: string; pensionado: string; obligaciones: ObligacionCarteraRow[] }>();
    for (const obligacion of this.getObligaciones()) {
      obligacion.pensionadoIds.forEach((pensionadoId, index) => {
        const grupo = grupos.get(pensionadoId) ?? {
          entidad: obligacion.entidad,
          pensionado: obligacion.pensionadosLabel.split(', ')[index] ?? obligacion.pensionadosLabel,
          obligaciones: [],
        };
        grupo.obligaciones.push(obligacion);
        grupos.set(pensionadoId, grupo);
      });
    }

    return Array.from(grupos.entries()).map(([pensionadoId, grupo]) => {
      const capital = grupo.obligaciones.reduce((sum, o) => sum + o.capital, 0);
      const intereses = grupo.obligaciones.reduce((sum, o) => sum + o.intereses, 0);
      const saldoTotal = grupo.obligaciones.reduce((sum, o) => sum + o.saldoTotal, 0);
      const total = capital + intereses;
      const cobertura = total > 0 ? Math.round(((total - saldoTotal) / total) * 100) : 0;

      return {
        pensionadoId,
        pensionado: grupo.pensionado,
        entidad: grupo.entidad,
        obligacionesPendientes: grupo.obligaciones.filter((o) => o.saldoTotal > 0).length,
        capital,
        capitalLabel: this.formatCurrency(capital),
        intereses,
        interesesLabel: this.formatCurrency(intereses),
        saldoTotal,
        saldoTotalLabel: this.formatCurrency(saldoTotal),
        cobertura: { percentage: cobertura },
      };
    });
  }

  /** HU-006 "consultar histórico de movimientos" / HU-007 "visualizar imputaciones realizadas". */
  getMovimientos(): readonly MovimientoCartera[] {
    return this.imputacionesService.imputaciones().map((imputacion) => ({
      idImputacion: imputacion.idImputacion,
      fecha: imputacion.fecha,
      cuentaCobroId: imputacion.cuentaCobroId,
      entidad: imputacion.entidad,
      origen: imputacion.origen,
      valorImputadoLabel: imputacion.valorImputadoLabel,
      valorAplicadoInteresesLabel: imputacion.valorAplicadoInteresesLabel,
      valorAplicadoCapitalLabel: imputacion.valorAplicadoCapitalLabel,
      saldoTotalObligacionLabel: imputacion.saldoTotalObligacionLabel,
    }));
  }

  private toRow(cuenta: CuentaCobro): ObligacionCarteraRow {
    const calculo = this.cuentasDeCobroService.calcularInteresesCuenta(cuenta); // CCAL-006/007/008
    const { saldoTotal } = this.imputacionesService.saldoDeCuenta(cuenta); // CCAL-016/017/018
    const capitalMasIntereses = cuenta.capital + calculo.interes; // CCAL-009
    const pagado = Math.max(0, capitalMasIntereses - saldoTotal);
    const tasaVigente = this.parametrizacionService.getTasaVigente();

    const estado: TableBadge =
      this.imputacionesService.estaCubierta(cuenta) && saldoTotal <= 0
        ? PAGADA_BADGE
        : this.cuentasDeCobroService.estadoVisual(cuenta);

    return {
      idCuenta: cuenta.idCuenta,
      entidadId: cuenta.entidadId,
      entidad: cuenta.entidad,
      pensionadoIds: cuenta.pensionadoIds,
      pensionadosLabel: cuenta.pensionados.join(', '),
      tipo: cuenta.tipo,
      capital: cuenta.capital,
      capitalLabel: cuenta.capitalLabel,
      intereses: calculo.interes,
      interesesLabel: calculo.interesLabel,
      diasMora: calculo.diasMora,
      tasaDtfLabel: tasaVigente ? tasaVigente.tasa : '—',
      capitalMasIntereses,
      capitalMasInteresesLabel: this.formatCurrency(capitalMasIntereses),
      pagado,
      pagadoLabel: this.formatCurrency(pagado),
      saldoTotal,
      saldoTotalLabel: this.formatCurrency(saldoTotal),
      estado,
    };
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
