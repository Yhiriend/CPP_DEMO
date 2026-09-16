import { TableBadge } from '../../../shared/ui/table/table.model';

export type EstadoLiquidacion = 'Vigente' | 'Procesada' | 'Error' | 'Borrador';

export const ESTADOS_LIQUIDACION: readonly EstadoLiquidacion[] = ['Vigente', 'Procesada', 'Error', 'Borrador'];

export interface Liquidacion {
  readonly idLiquidacion: string;
  readonly entidadId: string;
  readonly entidad: string;
  readonly pensionadoId: string;
  readonly pensionado: string;
  readonly periodo: string;
  readonly diasEntidad: number;
  readonly totalDiasPension: number;
  /** CCAL-001 — % Concurrencia = (Días entidad / Total días pensión) × 100. */
  readonly porcentajeConcurrencia: number;
  readonly valorMesadaPensional: number;
  /** CCAL-002 — Valor cuota parte = Valor mesada pensional × % concurrencia. */
  readonly capital: number;
  readonly capitalLabel: string;
  readonly intereses: number;
  readonly interesesLabel: string;
  readonly estado: TableBadge;
}

export interface LiquidacionFormValue {
  readonly pensionadoId: string;
  readonly periodo: string;
  readonly valorMesadaPensional: number;
  readonly diasEntidad: number;
  readonly totalDiasPension: number;
  readonly estado: EstadoLiquidacion;
}

/** Row shown in the consolidados por Entidad (HU-004) y por Pensionado (HU-005). */
export interface ConsolidadoLiquidacion {
  readonly id: string;
  readonly nombre: string;
  readonly cantidadLiquidaciones: number;
  readonly capital: number;
  readonly capitalLabel: string;
  readonly intereses: number;
  readonly interesesLabel: string;
  /** CCAL-004 — Valor total = Capital + Intereses. */
  readonly total: number;
  readonly totalLabel: string;
}
