import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { TableBadge } from '../../shared/ui/table/table.model';
import { todayIso } from '../../shared/utils/date';
import IMPUTACIONES_SEED from '../../fake_data/imputaciones.json';
import SALDOS_A_FAVOR_SEED from '../../fake_data/saldos-a-favor.json';
import { CuentaCobro } from '../cuentas-de-cobro/models/cuenta-cobro.model';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { PagoRecibido } from '../pagos/models/pago.model';
import { PagosService } from '../pagos/pagos.service';
import { AcuerdosService } from '../acuerdos/acuerdos.service';
import { DesembolsoFonpet } from '../acuerdos/models/acuerdo.model';
import {
  AplicarSaldoAFavorValue,
  Imputacion,
  ImputarDesembolsoValue,
  ImputarPagoValue,
  OrigenImputacion,
  SaldoAFavor,
} from './models/imputacion.model';

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

export interface PuedeReversar {
  readonly ok: boolean;
  readonly motivo?: string;
}

const SESSION_USER = 'admin@sgdp.gov.co';

const SIN_IDENTIFICAR: TableBadge = { label: 'Sin Identificar', variant: 'danger' };
const PENDIENTE: TableBadge = { label: 'Pendiente de Aplicar', variant: 'warning' };
const PARCIAL: TableBadge = { label: 'Parcialmente Aplicado', variant: 'info' };
const APLICADO: TableBadge = { label: 'Aplicado', variant: 'success' };

interface ConstruirImputacionInput {
  readonly origen: OrigenImputacion;
  readonly pagoId: string | null;
  readonly desembolsoId: string | null;
  readonly saldoAFavorId: string | null;
  readonly cuenta: CuentaCobro;
  readonly valorAImputar: number;
  readonly reglaAplicada: Imputacion['reglaAplicada'];
  readonly registrarExcedenteComoSaldoAFavor: boolean;
}

/**
 * HU-016/HU-017 (pagos), HU-022 (desembolsos FONPET) y la gestión de excepciones de
 * recaudo (reversos, saldo a favor) del flujo financiero ampliado — orquesta la
 * imputación de partidas a obligaciones (cuentas de cobro), aplicando primero a
 * intereses y luego a capital (CCAL-014/015), y CCAL-019 cuando un pago no indica una
 * obligación específica. Depende de Pagos, Cuentas de Cobro y Acuerdos FONPET (nunca
 * al revés) para evitar dependencias circulares entre servicios.
 */
@Injectable({ providedIn: 'root' })
export class ImputacionesService {
  private readonly pagosService = inject(PagosService);
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly acuerdosService = inject(AcuerdosService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _imputaciones = persistedSignal<Imputacion[]>('imputaciones', IMPUTACIONES_SEED as Imputacion[]);
  readonly imputaciones = this._imputaciones.asReadonly();

  private readonly _saldosAFavor = persistedSignal<SaldoAFavor[]>('saldos-a-favor', SALDOS_A_FAVOR_SEED as SaldoAFavor[]);
  readonly saldosAFavor = this._saldosAFavor.asReadonly();

  private correlativo = this._imputaciones().length;
  private correlativoSaldo = this._saldosAFavor().length;

  /** Imputaciones vigentes de una partida — un reverso deja de contar (CCAL-016/017/018 se recalculan). */
  private vigentes(): readonly Imputacion[] {
    return this._imputaciones().filter((i) => !i.reversada);
  }

  // --- Estado derivado de un pago (CCAL-023/CCAL-025) ---

  montoImputadoDePago(pagoId: string): number {
    return this.vigentes()
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
    return this.vigentes()
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

  // --- Saldo a favor (gestión de excepciones de recaudo — CCAL-022) ---

  montoImputadoDeSaldoAFavor(saldoId: string): number {
    return this.vigentes()
      .filter((imputacion) => imputacion.saldoAFavorId === saldoId)
      .reduce((sum, imputacion) => sum + imputacion.valorImputado, 0);
  }

  montoDisponibleDeSaldoAFavor(saldo: SaldoAFavor): number {
    if (saldo.anulado) return 0;
    return Math.max(0, saldo.valor - this.montoImputadoDeSaldoAFavor(saldo.id));
  }

  estadoDeSaldoAFavor(saldo: SaldoAFavor): TableBadge {
    if (saldo.anulado) return { label: 'Anulado', variant: 'neutral' };
    const disponible = this.montoDisponibleDeSaldoAFavor(saldo);
    if (disponible === saldo.valor) return PENDIENTE;
    if (disponible > 0) return PARCIAL;
    return APLICADO;
  }

  saldosAFavorPendientes(): readonly SaldoAFavor[] {
    return this._saldosAFavor().filter((s) => this.montoDisponibleDeSaldoAFavor(s) > 0);
  }

  /** Solo se puede aplicar a obligaciones de la misma entidad que originó el saldo a favor. */
  cuentasElegiblesDeSaldoAFavor(saldo: SaldoAFavor): readonly CuentaCobro[] {
    return this.cuentasDeCobroService
      .cuentasCobro()
      .filter((c) => c.entidadId === saldo.entidadId && this.saldoDeCuenta(c).saldoTotal > 0);
  }

  // --- Saldo derivado de una obligación (CCAL-016/017/018) ---

  saldoDeCuenta(cuenta: CuentaCobro): SaldoObligacion {
    const imputacionesCuenta = this.vigentes().filter((i) => i.cuentaCobroId === cuenta.idCuenta);
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
    if (!cuenta) {
      throw new Error(`No existe la cuenta de cobro ${cuentaCobroId}.`);
    }

    return this.construirYRegistrar({
      origen: 'Pago',
      pagoId: pago.idTransaccion,
      desembolsoId: null,
      saldoAFavorId: null,
      cuenta,
      valorAImputar: value.valorAImputar,
      reglaAplicada,
      registrarExcedenteComoSaldoAFavor: value.registrarExcedenteComoSaldoAFavor,
    });
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
    if (!cuenta) {
      throw new Error(`No existe la cuenta de cobro ${value.cuentaCobroId}.`);
    }

    return this.construirYRegistrar({
      origen: 'Desembolso FONPET',
      pagoId: null,
      desembolsoId: desembolso.idDesembolso,
      saldoAFavorId: null,
      cuenta,
      valorAImputar: value.valorAImputar,
      reglaAplicada: 'Manual',
      registrarExcedenteComoSaldoAFavor: value.registrarExcedenteComoSaldoAFavor,
    });
  }

  /** Gestión de excepciones de recaudo — aplica un saldo a favor ya registrado a otra obligación de la misma entidad. */
  aplicarSaldoAFavor(value: AplicarSaldoAFavorValue): Imputacion {
    const saldo = this._saldosAFavor().find((s) => s.id === value.saldoAFavorId);
    if (!saldo) {
      throw new Error(`No existe el saldo a favor ${value.saldoAFavorId}.`);
    }
    const disponible = this.montoDisponibleDeSaldoAFavor(saldo);
    if (value.valorAImputar <= 0 || value.valorAImputar > disponible) {
      throw new Error('El valor a imputar debe ser mayor a cero y no puede superar el saldo a favor disponible.');
    }

    const cuenta = this.cuentasDeCobroService.cuentasCobro().find((c) => c.idCuenta === value.cuentaCobroId);
    if (!cuenta) {
      throw new Error(`No existe la cuenta de cobro ${value.cuentaCobroId}.`);
    }
    if (cuenta.entidadId !== saldo.entidadId) {
      throw new Error('El saldo a favor solo puede aplicarse a obligaciones de la misma entidad que lo originó.');
    }

    // Un saldo a favor nunca vuelve a generar otro saldo a favor: el remanente simplemente no se imputa.
    return this.construirYRegistrar({
      origen: 'Saldo a Favor',
      pagoId: null,
      desembolsoId: null,
      saldoAFavorId: saldo.id,
      cuenta,
      valorAImputar: value.valorAImputar,
      reglaAplicada: 'Manual',
      registrarExcedenteComoSaldoAFavor: false,
    });
  }

  // --- Reversar (gestión de excepciones — "reversos solo con justificación") ---

  puedeReversar(imputacion: Imputacion): PuedeReversar {
    if (imputacion.reversada) {
      return { ok: false, motivo: 'Esta imputación ya fue reversada.' };
    }
    if (imputacion.saldoAFavorGeneradoId) {
      const saldo = this._saldosAFavor().find((s) => s.id === imputacion.saldoAFavorGeneradoId);
      if (saldo && this.montoImputadoDeSaldoAFavor(saldo.id) > 0) {
        return {
          ok: false,
          motivo: 'El saldo a favor que generó esta imputación ya fue aplicado a otra obligación; no se puede reversar.',
        };
      }
    }
    return { ok: true };
  }

  reversar(idImputacion: string, motivo: string): void {
    const imputacion = this._imputaciones().find((i) => i.idImputacion === idImputacion);
    if (!imputacion) {
      throw new Error(`No existe la imputación ${idImputacion}.`);
    }
    if (!motivo.trim()) {
      throw new Error('Registre el motivo del reverso.');
    }
    const validacion = this.puedeReversar(imputacion);
    if (!validacion.ok) {
      throw new Error(validacion.motivo ?? 'No es posible reversar esta imputación.');
    }

    const ahora = todayIso();
    this._imputaciones.update((list) =>
      list.map((i) =>
        i.idImputacion === idImputacion
          ? { ...i, reversada: true, motivoReversion: motivo.trim(), fechaReversion: ahora, reversadoPor: SESSION_USER }
          : i,
      ),
    );

    if (imputacion.saldoAFavorGeneradoId) {
      this._saldosAFavor.update((list) =>
        list.map((s) => (s.id === imputacion.saldoAFavorGeneradoId ? { ...s, anulado: true } : s)),
      );
    }

    this.auditoriaService.registrar({
      modulo: 'Imputaciones',
      accion: 'Reversar',
      entidadAfectada: `Imputación ${idImputacion} (${imputacion.cuentaCobroId})`,
      detalle: `Reverso de ${imputacion.valorImputadoLabel}. Motivo: ${motivo.trim()}`,
    });
  }

  private construirYRegistrar(input: ConstruirImputacionInput): Imputacion {
    const previsualizacion = this.previsualizar(input.cuenta.idCuenta, input.valorAImputar);
    if (!previsualizacion) {
      throw new Error(`No existe la cuenta de cobro ${input.cuenta.idCuenta}.`);
    }

    let saldoAFavorGeneradoId: string | null = null;
    const idImputacion = this.nextId();

    if (previsualizacion.excedente > 0 && input.registrarExcedenteComoSaldoAFavor) {
      const nuevoSaldo: SaldoAFavor = {
        id: this.nextSaldoId(),
        entidadId: input.cuenta.entidadId,
        entidad: input.cuenta.entidad,
        origenImputacionId: idImputacion,
        valor: previsualizacion.excedente,
        valorLabel: this.formatCurrency(previsualizacion.excedente),
        fecha: todayIso(),
        registradoPor: SESSION_USER,
        anulado: false,
      };
      this._saldosAFavor.update((list) => [nuevoSaldo, ...list]);
      saldoAFavorGeneradoId = nuevoSaldo.id;
    }

    const nueva: Imputacion = {
      idImputacion,
      origen: input.origen,
      pagoId: input.pagoId,
      desembolsoId: input.desembolsoId,
      saldoAFavorId: input.saldoAFavorId,
      cuentaCobroId: input.cuenta.idCuenta,
      entidadId: input.cuenta.entidadId,
      entidad: input.cuenta.entidad,
      pensionados: input.cuenta.pensionados,
      valorImputado: input.valorAImputar,
      valorImputadoLabel: this.formatCurrency(input.valorAImputar),
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
      saldoAFavorGeneradoId,
      reglaAplicada: input.reglaAplicada,
      fecha: todayIso(),
      registradoPor: SESSION_USER,
      reversada: false,
      motivoReversion: null,
      fechaReversion: null,
      reversadoPor: null,
    };

    this._imputaciones.update((list) => [nueva, ...list]);

    const referencia = input.pagoId ?? input.desembolsoId ?? input.saldoAFavorId ?? '';
    this.auditoriaService.registrar({
      modulo: 'Imputaciones',
      accion: 'Imputar',
      entidadAfectada: `Imputación ${nueva.idImputacion} (${nueva.cuentaCobroId})`,
      detalle: `Imputación de ${nueva.valorImputadoLabel} de ${input.origen.toLowerCase()} ${referencia} a la cuenta ${nueva.cuentaCobroId}.${saldoAFavorGeneradoId ? ` Excedente registrado como saldo a favor ${saldoAFavorGeneradoId}.` : ''}`,
    });

    return nueva;
  }

  private nextId(): string {
    this.correlativo += 1;
    return `IMP-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private nextSaldoId(): string {
    this.correlativoSaldo += 1;
    return `SAF-${new Date().getFullYear()}-${String(this.correlativoSaldo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
