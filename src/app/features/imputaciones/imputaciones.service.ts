import { Injectable, inject, signal } from '@angular/core';

import { TableBadge } from '../../shared/ui/table/table.model';
import { todayIso } from '../../shared/utils/date';
import IMPUTACIONES_SEED from '../../fake_data/imputaciones.json';
import { CuentaCobro } from '../cuentas-de-cobro/models/cuenta-cobro.model';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { PagoRecibido } from '../pagos/models/pago.model';
import { PagosService } from '../pagos/pagos.service';
import { AcuerdosService } from '../acuerdos/acuerdos.service';
import { DesembolsoFonpet } from '../acuerdos/models/acuerdo.model';
import { Imputacion, ImputarDesembolsoValue, ImputarPagoValue } from './models/imputacion.model';

export interface SaldoObligacion {
  readonly saldoCapital: number;
  readonly interesesPendientes: number;
  readonly saldoTotal: number;
}

export interface PrevisualizacionImputacion {
  readonly saldoCapitalAnterior: number;
  readonly saldoInteresesAnterior: number;
  readonly valorAplicadoIntereses: number;
  readonly valorAplicadoCapital: number;
  readonly saldoCapitalActualizado: number;
  readonly saldoInteresesActualizado: number;
  readonly saldoTotalObligacion: number;
  readonly excedente: number;
}

const SESSION_USER = 'admin@sgdp.gov.co';

const SIN_IDENTIFICAR: TableBadge = { label: 'Sin Identificar', variant: 'danger' };
const PENDIENTE: TableBadge = { label: 'Pendiente de Aplicar', variant: 'warning' };
const PARCIAL: TableBadge = { label: 'Parcialmente Aplicado', variant: 'info' };
const APLICADO: TableBadge = { label: 'Aplicado', variant: 'success' };

/**
 * HU-016/HU-017 (pagos) y HU-022 (desembolsos FONPET) — orquesta la imputación de
 * partidas a obligaciones (cuentas de cobro), aplicando primero a intereses y luego
 * a capital (CCAL-014/015), y CCAL-019 cuando un pago no indica una obligación
 * específica. Depende de Pagos, Cuentas de Cobro y Acuerdos FONPET (nunca al revés)
 * para evitar dependencias circulares entre servicios.
 */
@Injectable({ providedIn: 'root' })
export class ImputacionesService {
  private readonly pagosService = inject(PagosService);
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly acuerdosService = inject(AcuerdosService);

  private readonly _imputaciones = signal<Imputacion[]>(IMPUTACIONES_SEED as Imputacion[]);
  readonly imputaciones = this._imputaciones.asReadonly();

  private correlativo = this._imputaciones().length;

  // --- Estado derivado de un pago (CCAL-023/CCAL-025) ---

  montoImputadoDePago(pagoId: string): number {
    return this._imputaciones()
      .filter((imputacion) => imputacion.pagoId === pagoId)
      .reduce((sum, imputacion) => sum + imputacion.valorImputado, 0);
  }

  montoDisponibleDePago(pago: PagoRecibido): number {
    return Math.max(0, pago.montoRecibido - this.montoImputadoDePago(pago.idTransaccion));
  }

  estadoDePago(pago: PagoRecibido): TableBadge {
    if (!pago.cuentaCobroId) return SIN_IDENTIFICAR;
    const disponible = this.montoDisponibleDePago(pago);
    if (disponible === pago.montoRecibido) return PENDIENTE;
    if (disponible > 0) return PARCIAL;
    return APLICADO;
  }

  /** Pagos que aún tienen saldo disponible para imputar, identificados o no (HU-012 "disponibilizar para imputación"). */
  pagosPendientesDeImputar(): readonly PagoRecibido[] {
    return this.pagosService.pagos().filter((pago) => this.montoDisponibleDePago(pago) > 0);
  }

  // --- Estado derivado de un desembolso FONPET (HU-021 "disponibilizar recursos para imputación") ---

  montoImputadoDeDesembolso(desembolsoId: string): number {
    return this._imputaciones()
      .filter((imputacion) => imputacion.desembolsoId === desembolsoId)
      .reduce((sum, imputacion) => sum + imputacion.valorImputado, 0);
  }

  montoDisponibleDeDesembolso(desembolso: DesembolsoFonpet): number {
    return Math.max(0, desembolso.valor - this.montoImputadoDeDesembolso(desembolso.idDesembolso));
  }

  estadoDeDesembolso(desembolso: DesembolsoFonpet): TableBadge {
    const disponible = this.montoDisponibleDeDesembolso(desembolso);
    if (disponible === desembolso.valor) return PENDIENTE;
    if (disponible > 0) return PARCIAL;
    return APLICADO;
  }

  desembolsosPendientesDeImputar(): readonly DesembolsoFonpet[] {
    return this.acuerdosService.desembolsos().filter((d) => this.montoDisponibleDeDesembolso(d) > 0);
  }

  /** Obligaciones cubiertas por el acuerdo del desembolso que aún tienen saldo pendiente (HU-022). */
  cuentasElegiblesDeDesembolso(desembolso: DesembolsoFonpet): readonly CuentaCobro[] {
    const acuerdo = this.acuerdosService.getById(desembolso.acuerdoId);
    if (!acuerdo) return [];
    return this.cuentasDeCobroService
      .cuentasCobro()
      .filter((c) => acuerdo.cuentaCobroIds.includes(c.idCuenta) && this.saldoDeCuenta(c).saldoTotal > 0);
  }

  // --- Saldo derivado de una obligación (CCAL-016/017/018) ---

  saldoDeCuenta(cuenta: CuentaCobro): SaldoObligacion {
    const imputacionesCuenta = this._imputaciones().filter((i) => i.cuentaCobroId === cuenta.idCuenta);
    const aplicadoCapital = imputacionesCuenta.reduce((sum, i) => sum + i.valorAplicadoCapital, 0);
    const aplicadoIntereses = imputacionesCuenta.reduce((sum, i) => sum + i.valorAplicadoIntereses, 0);

    const saldoCapital = Math.max(0, cuenta.capital - aplicadoCapital);
    const interesesLive = this.cuentasDeCobroService.calcularInteresesCuenta(cuenta).interes;
    const interesesPendientes = Math.max(0, interesesLive - aplicadoIntereses);

    return { saldoCapital, interesesPendientes, saldoTotal: saldoCapital + interesesPendientes };
  }

  estaCubierta(cuenta: CuentaCobro): boolean {
    return this.saldoDeCuenta(cuenta).saldoTotal <= 0;
  }

  cuentasPendientesDeEntidad(entidadId: string): readonly CuentaCobro[] {
    return this.cuentasDeCobroService
      .cuentasCobro()
      .filter((c) => c.entidadId === entidadId && c.estado.label !== 'Anulada' && this.saldoDeCuenta(c).saldoTotal > 0);
  }

  /** CCAL-019 — obligación más antigua de la entidad (por fecha de vencimiento, o de generación si no está radicada). */
  obligacionMasAntigua(entidadId: string): CuentaCobro | undefined {
    return [...this.cuentasPendientesDeEntidad(entidadId)].sort((a, b) =>
      (a.fechaVencimiento ?? a.fechaGeneracion).localeCompare(b.fechaVencimiento ?? b.fechaGeneracion),
    )[0];
  }

  /** Cálculo puro (sin mutar estado) reutilizado por la vista previa del formulario y por imputar(). */
  previsualizar(cuentaCobroId: string, valorAImputar: number): PrevisualizacionImputacion | null {
    const cuenta = this.cuentasDeCobroService.cuentasCobro().find((c) => c.idCuenta === cuentaCobroId);
    if (!cuenta) return null;

    const { saldoCapital: saldoCapitalAnterior, interesesPendientes: saldoInteresesAnterior } =
      this.saldoDeCuenta(cuenta);

    // CCAL-014 — se aplica primero a intereses.
    const valorAplicadoIntereses = Math.min(valorAImputar, saldoInteresesAnterior);
    // CCAL-015 — el resto se aplica a capital.
    const valorAplicadoCapital = valorAImputar - valorAplicadoIntereses;
    // CCAL-022 — un pago no puede dejar la obligación en saldo negativo; el excedente se reporta aparte.
    const saldoCapitalActualizado = Math.max(0, saldoCapitalAnterior - valorAplicadoCapital); // CCAL-016
    const saldoInteresesActualizado = Math.max(0, saldoInteresesAnterior - valorAplicadoIntereses); // CCAL-017
    const saldoTotalObligacion = saldoCapitalActualizado + saldoInteresesActualizado; // CCAL-018
    const excedente = Math.max(0, valorAImputar - (saldoCapitalAnterior + saldoInteresesAnterior)); // CCAL-022

    return {
      saldoCapitalAnterior,
      saldoInteresesAnterior,
      valorAplicadoIntereses,
      valorAplicadoCapital,
      saldoCapitalActualizado,
      saldoInteresesActualizado,
      saldoTotalObligacion,
      excedente,
    };
  }

  // --- Imputar (HU-016/HU-017) ---

  imputar(value: ImputarPagoValue): Imputacion {
    const pago = this.pagosService.getById(value.pagoId);
    if (!pago) {
      throw new Error(`No existe el pago ${value.pagoId}.`);
    }
    const disponible = this.montoDisponibleDePago(pago);
    if (value.valorAImputar <= 0 || value.valorAImputar > disponible) {
      throw new Error('El valor a imputar debe ser mayor a cero y no puede superar el monto disponible del pago.');
    }

    let cuentaCobroId = value.cuentaCobroId ?? pago.cuentaCobroId;
    let reglaAplicada: Imputacion['reglaAplicada'] = 'Manual';
    if (!cuentaCobroId) {
      const masAntigua = this.obligacionMasAntigua(pago.entidadId); // CCAL-019
      if (!masAntigua) {
        throw new Error('No hay obligaciones pendientes para la entidad de este pago.');
      }
      cuentaCobroId = masAntigua.idCuenta;
      reglaAplicada = 'Obligación más antigua';
    }

    const cuenta = this.cuentasDeCobroService.cuentasCobro().find((c) => c.idCuenta === cuentaCobroId);
    const previsualizacion = this.previsualizar(cuentaCobroId, value.valorAImputar);
    if (!cuenta || !previsualizacion) {
      throw new Error(`No existe la cuenta de cobro ${cuentaCobroId}.`);
    }

    const nueva: Imputacion = {
      idImputacion: this.nextId(),
      origen: 'Pago',
      pagoId: pago.idTransaccion,
      desembolsoId: null,
      cuentaCobroId: cuenta.idCuenta,
      entidadId: cuenta.entidadId,
      entidad: cuenta.entidad,
      pensionados: cuenta.pensionados,
      valorImputado: value.valorAImputar,
      valorImputadoLabel: this.formatCurrency(value.valorAImputar),
      valorAplicadoIntereses: previsualizacion.valorAplicadoIntereses,
      valorAplicadoInteresesLabel: this.formatCurrency(previsualizacion.valorAplicadoIntereses),
      valorAplicadoCapital: previsualizacion.valorAplicadoCapital,
      valorAplicadoCapitalLabel: this.formatCurrency(previsualizacion.valorAplicadoCapital),
      saldoCapitalAnterior: previsualizacion.saldoCapitalAnterior,
      saldoCapitalActualizado: previsualizacion.saldoCapitalActualizado,
      saldoInteresesAnterior: previsualizacion.saldoInteresesAnterior,
      saldoInteresesActualizado: previsualizacion.saldoInteresesActualizado,
      saldoTotalObligacion: previsualizacion.saldoTotalObligacion,
      saldoTotalObligacionLabel: this.formatCurrency(previsualizacion.saldoTotalObligacion),
      excedente: previsualizacion.excedente,
      excedenteLabel: this.formatCurrency(previsualizacion.excedente),
      reglaAplicada,
      fecha: todayIso(),
      registradoPor: SESSION_USER,
    };

    this._imputaciones.update((list) => [nueva, ...list]);
    return nueva;
  }

  /** HU-022 — imputa un desembolso FONPET a una de las obligaciones cubiertas por su acuerdo. */
  imputarDesembolso(value: ImputarDesembolsoValue): Imputacion {
    const desembolso = this.acuerdosService.getDesembolsoById(value.desembolsoId);
    if (!desembolso) {
      throw new Error(`No existe el desembolso ${value.desembolsoId}.`);
    }
    const disponible = this.montoDisponibleDeDesembolso(desembolso);
    if (value.valorAImputar <= 0 || value.valorAImputar > disponible) {
      throw new Error('El valor a imputar debe ser mayor a cero y no puede superar el monto disponible del desembolso.');
    }

    const acuerdo = this.acuerdosService.getById(desembolso.acuerdoId);
    if (!acuerdo || !acuerdo.cuentaCobroIds.includes(value.cuentaCobroId)) {
      throw new Error('La obligación seleccionada no está cubierta por el acuerdo de este desembolso.');
    }

    const cuenta = this.cuentasDeCobroService.cuentasCobro().find((c) => c.idCuenta === value.cuentaCobroId);
    const previsualizacion = this.previsualizar(value.cuentaCobroId, value.valorAImputar);
    if (!cuenta || !previsualizacion) {
      throw new Error(`No existe la cuenta de cobro ${value.cuentaCobroId}.`);
    }

    const nueva: Imputacion = {
      idImputacion: this.nextId(),
      origen: 'Desembolso FONPET',
      pagoId: null,
      desembolsoId: desembolso.idDesembolso,
      cuentaCobroId: cuenta.idCuenta,
      entidadId: cuenta.entidadId,
      entidad: cuenta.entidad,
      pensionados: cuenta.pensionados,
      valorImputado: value.valorAImputar,
      valorImputadoLabel: this.formatCurrency(value.valorAImputar),
      valorAplicadoIntereses: previsualizacion.valorAplicadoIntereses,
      valorAplicadoInteresesLabel: this.formatCurrency(previsualizacion.valorAplicadoIntereses),
      valorAplicadoCapital: previsualizacion.valorAplicadoCapital,
      valorAplicadoCapitalLabel: this.formatCurrency(previsualizacion.valorAplicadoCapital),
      saldoCapitalAnterior: previsualizacion.saldoCapitalAnterior,
      saldoCapitalActualizado: previsualizacion.saldoCapitalActualizado,
      saldoInteresesAnterior: previsualizacion.saldoInteresesAnterior,
      saldoInteresesActualizado: previsualizacion.saldoInteresesActualizado,
      saldoTotalObligacion: previsualizacion.saldoTotalObligacion,
      saldoTotalObligacionLabel: this.formatCurrency(previsualizacion.saldoTotalObligacion),
      excedente: previsualizacion.excedente,
      excedenteLabel: this.formatCurrency(previsualizacion.excedente),
      reglaAplicada: 'Manual',
      fecha: todayIso(),
      registradoPor: SESSION_USER,
    };

    this._imputaciones.update((list) => [nueva, ...list]);
    return nueva;
  }

  private nextId(): string {
    this.correlativo += 1;
    return `IMP-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
