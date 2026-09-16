import { TableBadge } from '../../../shared/ui/table/table.model';

export interface Liquidacion {
  readonly idLiquidacion: string;
  readonly entidad: string;
  readonly pensionado: string;
  readonly periodo: string;
  readonly capital: number;
  readonly capitalLabel: string;
  readonly intereses: number;
  readonly interesesLabel: string;
  readonly estado: TableBadge;
}
