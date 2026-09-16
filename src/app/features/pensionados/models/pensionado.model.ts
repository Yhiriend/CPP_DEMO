import { TableBadge } from '../../../shared/ui/table/table.model';

export interface Pensionado {
  readonly tipoDocumento: TableBadge;
  readonly numeroDocumento: string;
  readonly nombresApellidos: string;
  readonly entidadPrincipal: string;
  readonly estado: TableBadge;
}
