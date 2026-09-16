import { TableBadge } from '../../../shared/ui/table/table.model';

export interface CuentaCobro {
  readonly idCuenta: string;
  readonly entidad: string;
  readonly capital: number;
  readonly capitalLabel: string;
  readonly intereses: number;
  readonly interesesLabel: string;
  readonly fechaVencimiento: string;
  readonly estado: TableBadge;
}
