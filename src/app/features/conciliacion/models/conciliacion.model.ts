import { TableBadge } from '../../../shared/ui/table/table.model';

/** Sistemas externos con los que se concilia, tal como los nombra el flujo financiero. */
export type FuenteConciliacion = 'SIIF' | 'FOPEP' | 'PASIVOCOL' | 'Bancos';
export const FUENTES_CONCILIACION: readonly FuenteConciliacion[] = ['SIIF', 'FOPEP', 'PASIVOCOL', 'Bancos'];

export type EstadoConciliacion = 'Conciliado' | 'Con Diferencia' | 'Ajustada';
export type TipoAjuste = 'Nota Débito' | 'Nota Crédito';
export const TIPOS_AJUSTE: readonly TipoAjuste[] = ['Nota Débito', 'Nota Crédito'];

export interface SoporteConciliacion {
  readonly nombreArchivo: string;
  readonly fechaCargue: string;
}

export interface AjusteConciliacion {
  readonly tipo: TipoAjuste;
  readonly valor: number;
  readonly valorLabel: string;
  readonly justificacion: string;
  readonly fecha: string;
  readonly registradoPor: string;
}

export interface Conciliacion {
  readonly id: string;
  readonly fuente: FuenteConciliacion;
  /** Formato "YYYY-MM" — permite filtrar los movimientos internos por período con precisión. */
  readonly periodo: string;
  readonly entidadId: string | null;
  readonly entidad: string;
  readonly valorReportado: number;
  readonly valorReportadoLabel: string;
  readonly valorInterno: number;
  readonly valorInternoLabel: string;
  /** valorReportado - valorInterno. */
  readonly diferencia: number;
  readonly diferenciaLabel: string;
  readonly soporte: SoporteConciliacion | null;
  readonly estado: TableBadge;
  readonly fechaGeneracion: string;
  readonly generadoPor: string;
  readonly ajuste: AjusteConciliacion | null;
}

export interface RegistrarConciliacionValue {
  readonly fuente: FuenteConciliacion;
  readonly periodo: string;
  readonly entidadId: string | null;
  readonly valorReportado: number;
  readonly soporte: SoporteConciliacion | null;
}

export interface RegistrarAjusteValue {
  readonly tipo: TipoAjuste;
  readonly valor: number;
  readonly justificacion: string;
}
