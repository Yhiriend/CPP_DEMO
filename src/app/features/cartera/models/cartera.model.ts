import { TableBadge, TableProgress } from '../../../shared/ui/table/table.model';

/** Una obligación (cuenta de cobro) vista desde Cartera — HU-006/007. */
export interface ObligacionCarteraRow {
  readonly idCuenta: string;
  readonly entidadId: string;
  readonly entidad: string;
  readonly pensionadoIds: readonly string[];
  readonly pensionadosLabel: string;
  readonly tipo: string;
  readonly capital: number;
  readonly capitalLabel: string;
  /** CCAL-008 — Interés total de la obligación, calculado en vivo. */
  readonly intereses: number;
  readonly interesesLabel: string;
  readonly diasMora: number;
  readonly tasaDtfLabel: string;
  /** CCAL-009 — Capital más intereses. */
  readonly capitalMasIntereses: number;
  readonly capitalMasInteresesLabel: string;
  readonly pagado: number;
  readonly pagadoLabel: string;
  /** CCAL-018 — Saldo total de la obligación, luego de pagos e imputaciones. */
  readonly saldoTotal: number;
  readonly saldoTotalLabel: string;
  readonly estado: TableBadge;
}

export interface CarteraPorEntidad {
  readonly entidadId: string;
  readonly entidad: string;
  readonly obligacionesPendientes: number;
  readonly capital: number;
  readonly capitalLabel: string;
  readonly intereses: number;
  readonly interesesLabel: string;
  readonly saldoTotal: number;
  readonly saldoTotalLabel: string;
  readonly cobertura: TableProgress;
}

export interface CarteraPorPensionado {
  readonly pensionadoId: string;
  readonly pensionado: string;
  readonly entidad: string;
  readonly obligacionesPendientes: number;
  readonly capital: number;
  readonly capitalLabel: string;
  readonly intereses: number;
  readonly interesesLabel: string;
  readonly saldoTotal: number;
  readonly saldoTotalLabel: string;
  readonly cobertura: TableProgress;
}

/** Un movimiento aplicado a una obligación — reutiliza el histórico de Imputaciones (HU-006/007). */
export interface MovimientoCartera {
  readonly idImputacion: string;
  readonly fecha: string;
  readonly cuentaCobroId: string;
  readonly entidad: string;
  readonly origen: string;
  readonly valorImputadoLabel: string;
  readonly valorAplicadoInteresesLabel: string;
  readonly valorAplicadoCapitalLabel: string;
  readonly saldoTotalObligacionLabel: string;
}
