import { TableBadge } from '../../../shared/ui/table/table.model';

export interface Acuerdo {
  readonly idRadicado: string;
  readonly entidad: string;
  readonly tipoAcuerdo: string;
  readonly valorSolicitado: string;
  readonly fechaRadicacion: string;
  readonly estado: TableBadge;
}
