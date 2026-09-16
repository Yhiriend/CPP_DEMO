import { TableBadge } from '../../../shared/ui/table/table.model';

export interface PagoRecibido {
  readonly idTransaccion: string;
  readonly entidad: string;
  readonly origen: TableBadge;
  readonly montoRecibido: number;
  readonly montoRecibidoLabel: string;
  readonly fecha: string;
  readonly estado: TableBadge;
}
