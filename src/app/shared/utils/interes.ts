const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** CCAL-006 — Días mora = Fecha de corte (o pago efectivo) − Fecha base de mora. */
export function calcularDiasMora(fechaBaseMora: string, fechaCorte: string): number {
  const base = new Date(fechaBaseMora).getTime();
  const corte = new Date(fechaCorte).getTime();
  return Math.max(0, Math.round((corte - base) / MS_PER_DAY));
}

/** CCAL-007 — Interés = Capital × (((1 + DTF/100)^(Días mora/365)) - 1). */
export function calcularInteresMora(capital: number, tasaDtfPorcentual: number, diasMora: number): number {
  if (diasMora <= 0) {
    return 0;
  }
  const factor = Math.pow(1 + tasaDtfPorcentual / 100, diasMora / 365) - 1;
  return Math.round(capital * factor);
}
