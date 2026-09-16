import { TableBadge } from '../../../shared/ui/table/table.model';

export type FuenteOrigenPago = 'Recursos Propios' | 'FONPET' | 'Depósito Judicial' | 'Otra';
export const FUENTES_PAGO: readonly FuenteOrigenPago[] = ['Recursos Propios', 'FONPET', 'Depósito Judicial', 'Otra'];

export type TipoPago = 'Total' | 'Parcial';
export const TIPOS_PAGO: readonly TipoPago[] = ['Total', 'Parcial'];

/** Soporte documental XLSX del recaudo (HU-012/013/014). */
export interface SoportePago {
  readonly nombreArchivo: string;
  readonly fechaCargue: string;
}

export interface PagoRecibido {
  readonly idTransaccion: string;
  readonly entidadId: string;
  readonly entidad: string;
  /** Obligación (cuenta de cobro) identificada para este recaudo — null si aún no se ha identificado (CCAL-023). */
  readonly cuentaCobroId: string | null;
  readonly origen: TableBadge;
  readonly tipo: TipoPago;
  readonly montoRecibido: number;
  readonly montoRecibidoLabel: string;
  readonly fecha: string;
  readonly soporte: SoportePago | null;
  readonly creadoPor: string;
}

export interface PagoFormValue {
  readonly entidadId: string;
  readonly cuentaCobroId: string | null;
  readonly origen: FuenteOrigenPago;
  readonly tipo: TipoPago;
  readonly montoRecibido: number;
  readonly fecha: string;
  readonly soporte: SoportePago | null;
}
