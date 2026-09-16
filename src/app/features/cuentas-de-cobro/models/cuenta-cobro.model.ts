import { TableBadge } from '../../../shared/ui/table/table.model';

export type EstadoCuentaCobro = 'Borrador' | 'Pendiente' | 'Radicada' | 'Vencida' | 'Anulada';
export type TipoCuentaCobro = 'Individual' | 'Consolidada';

export const ESTADOS_CUENTA_COBRO_GENERABLES: readonly EstadoCuentaCobro[] = ['Borrador', 'Pendiente'];

/** Soporte documental XLSX cargado al registrar la fecha de recepción (HU-011). */
export interface SoporteRecepcion {
  readonly nombreArchivo: string;
  readonly fechaCargue: string;
}

/** Una entrada del histórico de registros de fecha de recepción (HU-011 — mantener histórico). */
export interface RegistroRecepcion {
  readonly fechaRecepcion: string;
  readonly soporte: SoporteRecepcion | null;
  readonly registradoPor: string;
  readonly timestamp: string;
}

export interface CuentaCobro {
  readonly idCuenta: string;
  readonly tipo: TipoCuentaCobro;
  readonly entidadId: string;
  readonly entidad: string;
  readonly liquidacionIds: readonly string[];
  readonly pensionadoIds: readonly string[];
  readonly pensionados: readonly string[];
  /** CCAL-003 — Capital base de cobro = SUMA(Valor cuota parte) de los registros incluidos. */
  readonly capital: number;
  readonly capitalLabel: string;
  readonly fechaGeneracion: string;
  readonly fechaRecepcion: string | null;
  /** CCAL-005 — Fecha de vencimiento = Fecha de recibido + 30 días calendario. */
  readonly fechaVencimiento: string | null;
  readonly historialRecepcion: readonly RegistroRecepcion[];
  readonly estado: TableBadge;
  readonly creadoPor: string;
}

export interface GenerarCuentaIndividualValue {
  readonly liquidacionId: string;
  readonly estadoInicial: EstadoCuentaCobro;
}

export interface GenerarCuentaConsolidadaValue {
  readonly entidadId: string;
  readonly liquidacionIds: readonly string[];
  readonly estadoInicial: EstadoCuentaCobro;
}

export interface RegistrarRecepcionValue {
  readonly fechaRecepcion: string;
  readonly soporte: SoporteRecepcion | null;
}
