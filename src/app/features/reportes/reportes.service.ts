import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { todayIso, nowTimestamp } from '../../shared/utils/date';
import { AcuerdosService } from '../acuerdos/acuerdos.service';
import { AcuerdoFonpet } from '../acuerdos/models/acuerdo.model';
import { CarteraService } from '../cartera/cartera.service';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { CuentaCobro } from '../cuentas-de-cobro/models/cuenta-cobro.model';
import { EntidadesService } from '../entidades/entidades.service';
import { ImputacionesService } from '../imputaciones/imputaciones.service';
import { LiquidacionesService } from '../liquidaciones/liquidaciones.service';
import { PagosService } from '../pagos/pagos.service';
import { FilaDetalleReporte, FiltrosReporte, IndicadorReporte, ReporteGenerado, TablaDetalleReporte } from './models/reporte.model';

const SESSION_USER = 'admin@sgdp.gov.co';

/**
 * HU-027 a HU-031 — genera los distintos reportes (mensual, anual, financiero,
 * contable, jurídico) como distintas combinaciones de indicadores/tablas sobre los
 * mismos datos ya vivos del resto del sistema. Es de solo lectura + un histórico de
 * los reportes generados en la sesión (trazabilidad — NFR común a las 5 HU).
 */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly liquidacionesService = inject(LiquidacionesService);
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly pagosService = inject(PagosService);
  private readonly acuerdosService = inject(AcuerdosService);
  private readonly carteraService = inject(CarteraService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _historico = persistedSignal<ReporteGenerado[]>('reportes-historico', []);
  readonly historico = this._historico.asReadonly();

  private correlativo = this._historico().length;

  generar(filtros: FiltrosReporte): ReporteGenerado {
    const entidad = filtros.entidadId ? this.entidadesService.getEntidadById(filtros.entidadId) : undefined;
    const entidadLabel = entidad?.nombre ?? 'Todas las entidades';

    const cuentas = this.cuentasDeCobroService
      .cuentasCobro()
      .filter((c) => c.estado.label !== 'Anulada' && (!filtros.entidadId || c.entidadId === filtros.entidadId));

    const liquidaciones = this.liquidacionesService
      .liquidaciones()
      .filter((l) => !filtros.entidadId || l.entidadId === filtros.entidadId);

    const pagos = this.pagosService
      .pagos()
      .filter(
        (p) =>
          p.fecha >= filtros.fechaDesde &&
          p.fecha <= filtros.fechaHasta &&
          (!filtros.entidadId || p.entidadId === filtros.entidadId),
      );

    const imputaciones = this.imputacionesService
      .imputaciones()
      .filter(
        (i) =>
          i.fecha >= filtros.fechaDesde &&
          i.fecha <= filtros.fechaHasta &&
          (!filtros.entidadId || i.entidadId === filtros.entidadId),
      );

    const acuerdos = this.acuerdosService
      .acuerdos()
      .filter((a) => !filtros.entidadId || a.entidadId === filtros.entidadId);

    const capitalLiquidado = liquidaciones.reduce((sum, l) => sum + l.capital, 0); // CCAL-003
    const capitalCuentas = cuentas.reduce((sum, c) => sum + c.capital, 0);
    const interesesCuentas = cuentas.reduce(
      (sum, c) => sum + this.cuentasDeCobroService.calcularInteresesCuenta(c).interes,
      0,
    ); // CCAL-008
    const valorTotalCuentas = capitalCuentas + interesesCuentas; // CCAL-004
    const saldoPendiente = cuentas.reduce((sum, c) => sum + this.imputacionesService.saldoDeCuenta(c).saldoTotal, 0); // CCAL-018
    const valorPagadoTotal = pagos.reduce((sum, p) => sum + p.montoRecibido, 0); // CCAL-012
    const aplicadoIntereses = imputaciones.reduce((sum, i) => sum + i.valorAplicadoIntereses, 0); // CCAL-014
    const aplicadoCapital = imputaciones.reduce((sum, i) => sum + i.valorAplicadoCapital, 0); // CCAL-015
    const excedentes = imputaciones.reduce((sum, i) => sum + i.excedente, 0); // CCAL-022
    const valorAprobadoFonpet = acuerdos.reduce((sum, a) => sum + a.valorAprobado, 0);
    const valorDesembolsadoFonpet = acuerdos.reduce((sum, a) => sum + this.acuerdosService.valorDesembolsado(a.idAcuerdo), 0);

    let indicadores: IndicadorReporte[] = [];
    let tablas: TablaDetalleReporte[] = [];

    switch (filtros.tipo) {
      case 'Mensual':
        indicadores = [
          { etiqueta: 'Capital Liquidado (CCAL-003)', valor: this.formatCurrency(capitalLiquidado) },
          { etiqueta: 'Valor Total Cuentas de Cobro (CCAL-004)', valor: this.formatCurrency(valorTotalCuentas) },
          { etiqueta: 'Intereses Causados (CCAL-008)', valor: this.formatCurrency(interesesCuentas) },
          { etiqueta: 'Valor Pagado (CCAL-012)', valor: this.formatCurrency(valorPagadoTotal) },
          { etiqueta: 'Aplicado a Capital (CCAL-015)', valor: this.formatCurrency(aplicadoCapital) },
          { etiqueta: 'Saldo Pendiente (CCAL-018)', valor: this.formatCurrency(saldoPendiente) },
        ];
        tablas = [this.tablaCuentas('Cuentas de Cobro del Período', cuentas)];
        break;

      case 'Anual':
        indicadores = [
          { etiqueta: 'Capital Liquidado en la Vigencia (CCAL-003)', valor: this.formatCurrency(capitalLiquidado) },
          { etiqueta: 'Valor Total Causado (CCAL-004)', valor: this.formatCurrency(valorTotalCuentas) },
          { etiqueta: 'Intereses Acumulados (CCAL-008)', valor: this.formatCurrency(interesesCuentas) },
          { etiqueta: 'Recaudo Total (CCAL-012)', valor: this.formatCurrency(valorPagadoTotal) },
          { etiqueta: 'N° Liquidaciones', valor: `${liquidaciones.length}` },
          { etiqueta: 'N° Acuerdos FONPET', valor: `${acuerdos.length}` },
        ];
        tablas = [this.tablaCarteraPorEntidad(filtros.entidadId)];
        break;

      case 'Financiero':
        indicadores = [
          { etiqueta: 'Cartera Total (Capital)', valor: this.formatCurrency(capitalCuentas) },
          { etiqueta: 'Intereses (CCAL-008)', valor: this.formatCurrency(interesesCuentas) },
          { etiqueta: 'Valor Pagado (CCAL-012)', valor: this.formatCurrency(valorPagadoTotal) },
          { etiqueta: 'Excedentes de Pago (CCAL-022)', valor: this.formatCurrency(excedentes) },
          { etiqueta: 'Valor Aprobado FONPET', valor: this.formatCurrency(valorAprobadoFonpet) },
          { etiqueta: 'Valor Desembolsado FONPET', valor: this.formatCurrency(valorDesembolsadoFonpet) },
        ];
        tablas = [this.tablaAcuerdos(acuerdos)];
        break;

      case 'Contable':
        indicadores = [
          { etiqueta: 'Capital Base (CCAL-003)', valor: this.formatCurrency(capitalCuentas) },
          { etiqueta: 'Valor Total Cuenta (CCAL-004)', valor: this.formatCurrency(valorTotalCuentas) },
          { etiqueta: 'Intereses Causados (CCAL-008)', valor: this.formatCurrency(interesesCuentas) },
          {
            etiqueta: 'Saldo Capital Pendiente (CCAL-016)',
            valor: this.formatCurrency(cuentas.reduce((s, c) => s + this.imputacionesService.saldoDeCuenta(c).saldoCapital, 0)),
          },
          {
            etiqueta: 'Saldo Intereses Pendiente (CCAL-017)',
            valor: this.formatCurrency(
              cuentas.reduce((s, c) => s + this.imputacionesService.saldoDeCuenta(c).interesesPendientes, 0),
            ),
          },
          { etiqueta: 'Saldo Total (CCAL-018)', valor: this.formatCurrency(saldoPendiente) },
        ];
        tablas = [this.tablaConciliacion('Cuentas de Cobro — Conciliación', cuentas)];
        break;

      case 'Jurídico': {
        const vencidas = cuentas.filter((c) => this.cuentasDeCobroService.estadoVisual(c).label === 'Vencida');
        const deudoras = new Set(cuentas.filter((c) => this.imputacionesService.saldoDeCuenta(c).saldoTotal > 0).map((c) => c.entidad));
        indicadores = [
          { etiqueta: 'Obligaciones Pendientes', valor: `${cuentas.filter((c) => this.imputacionesService.saldoDeCuenta(c).saldoTotal > 0).length}` },
          { etiqueta: 'Entidades Deudoras', valor: `${deudoras.size}` },
          { etiqueta: 'Cartera Vencida', valor: this.formatCurrency(vencidas.reduce((s, c) => s + this.imputacionesService.saldoDeCuenta(c).saldoTotal, 0)) },
          { etiqueta: 'Acuerdos de Pago Vigentes', valor: `${acuerdos.filter((a) => a.estado.label !== 'Incumplido').length}` },
        ];
        tablas = [this.tablaCuentas('Cartera Vencida — Casos para Gestión de Cobro', vencidas)];
        break;
      }
    }

    const nuevo: ReporteGenerado = {
      id: this.nextId(),
      tipo: filtros.tipo,
      fechaGeneracion: todayIso(),
      timestamp: nowTimestamp(),
      filtros,
      entidad: entidadLabel,
      indicadores,
      tablas,
      generadoPor: SESSION_USER,
    };

    this._historico.update((list) => [nuevo, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Cuentas de Cobro',
      accion: 'Generar Reporte',
      entidadAfectada: `Reporte ${filtros.tipo} (${entidadLabel})`,
      detalle: `Generación de reporte ${filtros.tipo.toLowerCase()} del ${filtros.fechaDesde} al ${filtros.fechaHasta}.`,
    });

    return nuevo;
  }

  private tablaCuentas(titulo: string, cuentas: readonly CuentaCobro[]): TablaDetalleReporte {
    const filas: FilaDetalleReporte[] = cuentas.map((c) => {
      const { interes } = this.cuentasDeCobroService.calcularInteresesCuenta(c);
      const { saldoTotal } = this.imputacionesService.saldoDeCuenta(c);
      return {
        'ID Cuenta': c.idCuenta,
        Entidad: c.entidad,
        Capital: this.formatCurrency(c.capital),
        Intereses: this.formatCurrency(interes),
        'Saldo Pendiente': this.formatCurrency(saldoTotal),
        Estado: this.estadoEfectivo(c),
      };
    });
    return { titulo, columnas: ['ID Cuenta', 'Entidad', 'Capital', 'Intereses', 'Saldo Pendiente', 'Estado'], filas };
  }

  /** Igual que CuentasDeCobro/Cartera: una cuenta cubierta por sus imputaciones se muestra como "Pagada". */
  private estadoEfectivo(cuenta: CuentaCobro): string {
    if (cuenta.estado.label !== 'Anulada' && this.imputacionesService.estaCubierta(cuenta)) {
      return 'Pagada';
    }
    return this.cuentasDeCobroService.estadoVisual(cuenta).label;
  }

  private tablaConciliacion(titulo: string, cuentas: readonly CuentaCobro[]): TablaDetalleReporte {
    const filas: FilaDetalleReporte[] = cuentas.map((c) => {
      const saldo = this.imputacionesService.saldoDeCuenta(c);
      return {
        'ID Cuenta': c.idCuenta,
        Entidad: c.entidad,
        'Capital Base': this.formatCurrency(c.capital),
        'Saldo Capital': this.formatCurrency(saldo.saldoCapital),
        'Saldo Intereses': this.formatCurrency(saldo.interesesPendientes),
        'Saldo Total': this.formatCurrency(saldo.saldoTotal),
      };
    });
    return {
      titulo,
      columnas: ['ID Cuenta', 'Entidad', 'Capital Base', 'Saldo Capital', 'Saldo Intereses', 'Saldo Total'],
      filas,
    };
  }

  private tablaAcuerdos(acuerdos: readonly AcuerdoFonpet[]): TablaDetalleReporte {
    const filas: FilaDetalleReporte[] = acuerdos.map((a) => ({
      'ID Acuerdo': a.idAcuerdo,
      Entidad: a.entidad,
      'Valor Aprobado': a.valorAprobadoLabel,
      Desembolsado: this.formatCurrency(this.acuerdosService.valorDesembolsado(a.idAcuerdo)),
      'Saldo por Desembolsar': this.formatCurrency(this.acuerdosService.saldoPorDesembolsar(a)),
      Estado: a.estado.label,
    }));
    return {
      titulo: 'Acuerdos de Pago FONPET',
      columnas: ['ID Acuerdo', 'Entidad', 'Valor Aprobado', 'Desembolsado', 'Saldo por Desembolsar', 'Estado'],
      filas,
    };
  }

  private tablaCarteraPorEntidad(entidadId: string | null): TablaDetalleReporte {
    const filas: FilaDetalleReporte[] = this.carteraService
      .getCarteraPorEntidad()
      .filter((c) => !entidadId || c.entidadId === entidadId)
      .map((c) => ({
        Entidad: c.entidad,
        'Oblig. Pendientes': `${c.obligacionesPendientes}`,
        Capital: c.capitalLabel,
        Intereses: c.interesesLabel,
        'Saldo Pendiente': c.saldoTotalLabel,
        'Cobertura %': `${c.cobertura.percentage}`,
      }));
    return {
      titulo: 'Cartera por Entidad',
      columnas: ['Entidad', 'Oblig. Pendientes', 'Capital', 'Intereses', 'Saldo Pendiente', 'Cobertura %'],
      filas,
    };
  }

  private nextId(): string {
    this.correlativo += 1;
    return `REP-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }
}
