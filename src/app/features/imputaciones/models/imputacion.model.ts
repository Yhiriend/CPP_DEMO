export type ReglaImputacion = 'Manual' | 'Obligación más antigua';
export type OrigenImputacion = 'Pago' | 'Desembolso FONPET' | 'Saldo a Favor';

export interface Imputacion {
  readonly idImputacion: string;
  readonly origen: OrigenImputacion;
  readonly pagoId: string | null;
  readonly desembolsoId: string | null;
  readonly saldoAFavorId: string | null;
  readonly cuentaCobroId: string;
  readonly entidadId: string;
  readonly entidad: string;
  readonly pensionados: readonly string[];
  /** CCAL-013 — Valor de partida a imputar. */
  readonly valorImputado: number;
  readonly valorImputadoLabel: string;
  /** CCAL-014 — Valor aplicado a intereses = MIN(valor de partida; intereses pendientes). */
  readonly valorAplicadoIntereses: number;
  readonly valorAplicadoInteresesLabel: string;
  /** CCAL-015 — Valor aplicado a capital = valor imputado - valor aplicado a intereses. */
  readonly valorAplicadoCapital: number;
  readonly valorAplicadoCapitalLabel: string;
  readonly saldoCapitalAnterior: number;
  /** CCAL-016 — Saldo capital actualizado. */
  readonly saldoCapitalActualizado: number;
  readonly saldoInteresesAnterior: number;
  /** CCAL-017 — Saldo intereses actualizado. */
  readonly saldoInteresesActualizado: number;
  /** CCAL-018 — Saldo total obligación = saldo capital + saldo intereses actualizados. */
  readonly saldoTotalObligacion: number;
  readonly saldoTotalObligacionLabel: string;
  /** CCAL-022 — Excedente de pago = MAX(0; valor imputado - saldo total previo). */
  readonly excedente: number;
  readonly excedenteLabel: string;
  /** Si el excedente se registró como saldo a favor, el id de ese registro (gestión de excepciones). */
  readonly saldoAFavorGeneradoId: string | null;
  /** CCAL-019 — regla aplicada cuando no se indicó una obligación específica. */
  readonly reglaAplicada: ReglaImputacion;
  readonly fecha: string;
  readonly registradoPor: string;
  /** Reverso — solo con justificación; una imputación reversada deja de contar en los saldos. */
  readonly reversada: boolean;
  readonly motivoReversion: string | null;
  readonly fechaReversion: string | null;
  readonly reversadoPor: string | null;
}

export interface ImputarPagoValue {
  readonly pagoId: string;
  /** null → se aplica CCAL-019 (obligación más antigua de la entidad del pago). */
  readonly cuentaCobroId: string | null;
  readonly valorAImputar: number;
  readonly registrarExcedenteComoSaldoAFavor: boolean;
}

export interface ImputarDesembolsoValue {
  readonly desembolsoId: string;
  readonly cuentaCobroId: string;
  readonly valorAImputar: number;
  readonly registrarExcedenteComoSaldoAFavor: boolean;
}

export interface AplicarSaldoAFavorValue {
  readonly saldoAFavorId: string;
  readonly cuentaCobroId: string;
  readonly valorAImputar: number;
}

/** Gestión de excepciones de recaudo — CCAL-022 registrado como crédito reutilizable de la entidad. */
export interface SaldoAFavor {
  readonly id: string;
  readonly entidadId: string;
  readonly entidad: string;
  readonly origenImputacionId: string;
  readonly valor: number;
  readonly valorLabel: string;
  readonly fecha: string;
  readonly registradoPor: string;
  readonly anulado: boolean;
}
