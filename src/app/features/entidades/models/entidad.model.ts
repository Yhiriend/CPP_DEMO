import { TableBadge } from '../../../shared/ui/table/table.model';

export type EstadoEntidad = 'Activa' | 'Inactiva' | 'Revisión';

export const TIPOS_ENTIDAD = ['Departamental', 'Municipal', 'Distrital', 'Fondo Pensional'] as const;

export interface Entidad {
  readonly id: string;
  readonly codigoNit: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly totalPensionados: string;
  readonly saldoCarteraTotal: string;
  readonly estado: TableBadge;
  readonly deudaTotalActual: string;
  readonly ultimoPago: string;
  readonly creadoPor: string;
  readonly fechaCreacion: string;
  readonly ultimaModificacion: string;
  readonly modificadoPor: string;
}

export interface EntidadFormValue {
  readonly codigoNit: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly estado: EstadoEntidad;
}

export interface ObligacionCartera {
  readonly id: string;
  readonly periodo: string;
  readonly capitalAdeudado: number;
  readonly capitalAdeudadoLabel: string;
  /** Mora start date (CCAL-006 input) — interest is calculated live from this, not stored. */
  readonly fechaBaseMora: string;
  readonly estadoPago: TableBadge;
}
