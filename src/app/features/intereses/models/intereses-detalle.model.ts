import { TableBadge } from '../../../shared/ui/table/table.model';

export interface InteresesDetalleRow {
  readonly entidadId: string;
  readonly entidad: string;
  readonly obligacionId: string;
  readonly periodo: string;
  readonly capitalAdeudadoLabel: string;
  readonly fechaBaseMora: string;
  readonly diasMora: number;
  readonly tasaDtfAplicadaLabel: string;
  readonly interesesLabel: string;
  readonly estadoPago: TableBadge;
}
