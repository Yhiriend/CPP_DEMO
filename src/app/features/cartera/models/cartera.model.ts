import { TableProgress } from '../../../shared/ui/table/table.model';

export interface CarteraPorEntidad {
  readonly entidadId: string;
  readonly nit: string;
  readonly nombre: string;
  readonly obligacionesPendientes: number;
  readonly capitalAdeudado: number;
  readonly capitalAdeudadoLabel: string;
  readonly interesesGenerados: number;
  readonly interesesGeneradosLabel: string;
  readonly totalDeuda: number;
  readonly totalDeudaLabel: string;
  readonly cobertura: TableProgress;
}
