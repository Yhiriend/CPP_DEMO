import { TableBadge } from '../../../shared/ui/table/table.model';

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

export interface ObligacionCartera {
  readonly id: string;
  readonly periodo: string;
  readonly capitalAdeudado: number;
  readonly capitalAdeudadoLabel: string;
  readonly interesesGenerados: number;
  readonly interesesGeneradosLabel: string;
  readonly estadoPago: TableBadge;
}
