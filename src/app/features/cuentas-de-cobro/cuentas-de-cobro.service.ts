import { Injectable, inject, signal } from '@angular/core';

import { TableBadge, TableBadgeVariant } from '../../shared/ui/table/table.model';
import { nowTimestamp, todayIso } from '../../shared/utils/date';
import { numeroALetras } from '../../shared/utils/numero-a-letras';
import CUENTAS_COBRO_SEED from '../../fake_data/cuentas-cobro.json';
import { EntidadesService } from '../entidades/entidades.service';
import { InteresesCalculoService } from '../intereses/intereses-calculo.service';
import { LiquidacionesService } from '../liquidaciones/liquidaciones.service';
import {
  CuentaCobro,
  EstadoCuentaCobro,
  GenerarCuentaConsolidadaValue,
  GenerarCuentaIndividualValue,
  RegistrarRecepcionValue,
  TipoCuentaCobro,
} from './models/cuenta-cobro.model';

const ESTADO_VARIANT: Record<EstadoCuentaCobro, TableBadgeVariant> = {
  Borrador: 'neutral',
  Pendiente: 'warning',
  Radicada: 'success',
  Vencida: 'danger',
  Pagada: 'success',
  Anulada: 'neutral',
};

const DIAS_VENCIMIENTO = 30; // CCAL-005
const SESSION_USER = 'admin@sgdp.gov.co';

interface NuevaCuentaInput {
  readonly tipo: TipoCuentaCobro;
  readonly entidadId: string;
  readonly entidad: string;
  readonly liquidacionIds: readonly string[];
  readonly pensionadoIds: readonly string[];
  readonly pensionados: readonly string[];
  readonly capital: number;
  readonly estadoInicial: EstadoCuentaCobro;
}

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class CuentasDeCobroService {
  private readonly entidadesService = inject(EntidadesService);
  private readonly liquidacionesService = inject(LiquidacionesService);
  private readonly interesesCalculoService = inject(InteresesCalculoService);

  private readonly _cuentasCobro = signal<CuentaCobro[]>(CUENTAS_COBRO_SEED as CuentaCobro[]);
  readonly cuentasCobro = this._cuentasCobro.asReadonly();

  private correlativo = this._cuentasCobro().length;

  /** Liquidaciones que ya hacen parte de una cuenta de cobro vigente (no anulada). */
  liquidacionesFacturadas(): ReadonlySet<string> {
    const ids = new Set<string>();
    for (const cuenta of this._cuentasCobro()) {
      if (cuenta.estado.label === 'Anulada') continue;
      for (const id of cuenta.liquidacionIds) ids.add(id);
    }
    return ids;
  }

  /** HU-010 — cuenta de cobro individual, generada a partir de una única liquidación. */
  generarIndividual(value: GenerarCuentaIndividualValue): CuentaCobro {
    const liquidacion = this.liquidacionesService
      .liquidaciones()
      .find((l) => l.idLiquidacion === value.liquidacionId);
    if (!liquidacion) {
      throw new Error(`No existe la liquidación ${value.liquidacionId}.`);
    }

    return this.crearCuenta({
      tipo: 'Individual',
      entidadId: liquidacion.entidadId,
      entidad: liquidacion.entidad,
      liquidacionIds: [liquidacion.idLiquidacion],
      pensionadoIds: [liquidacion.pensionadoId],
      pensionados: [liquidacion.pensionado],
      capital: liquidacion.capital,
      estadoInicial: value.estadoInicial,
    });
  }

  /** HU-010 — cuenta de cobro consolidada, agrupando varias liquidaciones de una misma entidad (CCAL-003). */
  generarConsolidada(value: GenerarCuentaConsolidadaValue): CuentaCobro {
    const entidad = this.entidadesService.getEntidadById(value.entidadId);
    if (!entidad) {
      throw new Error(`No existe la entidad ${value.entidadId}.`);
    }
    const liquidaciones = this.liquidacionesService
      .liquidaciones()
      .filter((l) => value.liquidacionIds.includes(l.idLiquidacion));
    if (liquidaciones.length === 0) {
      throw new Error('Seleccione al menos una liquidación.');
    }

    const capital = liquidaciones.reduce((sum, l) => sum + l.capital, 0); // CCAL-003
    const pensionadoIds = Array.from(new Set(liquidaciones.map((l) => l.pensionadoId)));
    const pensionados = Array.from(new Set(liquidaciones.map((l) => l.pensionado)));

    return this.crearCuenta({
      tipo: 'Consolidada',
      entidadId: entidad.id,
      entidad: entidad.nombre,
      liquidacionIds: liquidaciones.map((l) => l.idLiquidacion),
      pensionadoIds,
      pensionados,
      capital,
      estadoInicial: value.estadoInicial,
    });
  }

  /** HU-011 — registra (o actualiza, de forma controlada) la fecha de recepción y calcula el vencimiento (CCAL-005). */
  registrarRecepcion(idCuenta: string, value: RegistrarRecepcionValue): void {
    const cuenta = this._cuentasCobro().find((c) => c.idCuenta === idCuenta);
    if (!cuenta) {
      throw new Error(`No existe la cuenta ${idCuenta}.`);
    }
    if (value.fechaRecepcion < cuenta.fechaGeneracion) {
      throw new Error('La fecha de recepción no puede ser anterior a la fecha de generación de la cuenta.');
    }
    if (value.fechaRecepcion > todayIso()) {
      throw new Error('La fecha de recepción no puede ser posterior a la fecha actual.');
    }

    const fechaVencimiento = this.calcularVencimiento(value.fechaRecepcion);
    const registro = {
      fechaRecepcion: value.fechaRecepcion,
      soporte: value.soporte,
      registradoPor: SESSION_USER,
      timestamp: nowTimestamp(),
    };

    this._cuentasCobro.update((list) =>
      list.map((c) =>
        c.idCuenta === idCuenta
          ? {
              ...c,
              fechaRecepcion: value.fechaRecepcion,
              fechaVencimiento,
              historialRecepcion: [registro, ...c.historialRecepcion],
              estado: { label: 'Radicada', variant: ESTADO_VARIANT.Radicada },
            }
          : c,
      ),
    );
  }

  anular(idCuenta: string): void {
    this.setEstado(idCuenta, 'Anulada');
  }

  /** Una cuenta Radicada cuya fecha de vencimiento ya pasó se muestra como Vencida (derivado en vivo, CCAL-005). */
  estadoVisual(cuenta: CuentaCobro): TableBadge {
    if (cuenta.estado.label === 'Radicada' && cuenta.fechaVencimiento && cuenta.fechaVencimiento < todayIso()) {
      return { label: 'Vencida', variant: ESTADO_VARIANT.Vencida };
    }
    return cuenta.estado;
  }

  /** CCAL-004 — intereses de la cuenta, calculados en vivo desde la fecha de recepción (reutiliza CCAL-006/007). */
  calcularInteresesCuenta(cuenta: CuentaCobro): { diasMora: number; interes: number; interesLabel: string } {
    if (!cuenta.fechaRecepcion) {
      return { diasMora: 0, interes: 0, interesLabel: this.formatCurrency(0) };
    }
    const calculo = this.interesesCalculoService.calcular(cuenta.capital, cuenta.fechaRecepcion);
    return { diasMora: calculo.diasMora, interes: calculo.interes, interesLabel: calculo.interesLabel };
  }

  /** CCAL-010 — valor en letras del valor total de la cuenta. */
  valorEnLetras(valorTotal: number): string {
    return numeroALetras(valorTotal);
  }

  private crearCuenta(input: NuevaCuentaInput): CuentaCobro {
    const nueva: CuentaCobro = {
      idCuenta: this.nextId(),
      tipo: input.tipo,
      entidadId: input.entidadId,
      entidad: input.entidad,
      liquidacionIds: input.liquidacionIds,
      pensionadoIds: input.pensionadoIds,
      pensionados: input.pensionados,
      capital: input.capital,
      capitalLabel: this.formatCurrency(input.capital),
      fechaGeneracion: todayIso(),
      fechaRecepcion: null,
      fechaVencimiento: null,
      historialRecepcion: [],
      estado: { label: input.estadoInicial, variant: ESTADO_VARIANT[input.estadoInicial] },
      creadoPor: SESSION_USER,
    };

    this._cuentasCobro.update((list) => [nueva, ...list]);
    return nueva;
  }

  private calcularVencimiento(fechaRecepcion: string): string {
    const fecha = new Date(fechaRecepcion);
    fecha.setDate(fecha.getDate() + DIAS_VENCIMIENTO);
    return fecha.toISOString().slice(0, 10);
  }

  private setEstado(idCuenta: string, estado: EstadoCuentaCobro): void {
    this._cuentasCobro.update((list) =>
      list.map((c) =>
        c.idCuenta === idCuenta ? { ...c, estado: { label: estado, variant: ESTADO_VARIANT[estado] } } : c,
      ),
    );
  }

  private nextId(): string {
    this.correlativo += 1;
    return `CC-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
