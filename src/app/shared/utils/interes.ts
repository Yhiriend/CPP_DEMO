const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Una tasa DTF (efectiva anual) vigente a partir de una fecha — igual forma que ParametrizacionService.DtfRate. */
export interface TasaDtfVigencia {
  readonly vigenciaInicial: string;
  readonly tasaValor: number;
}

/** CCAL-006 — Días mora = Fecha de corte (o pago efectivo) − Fecha base de mora. */
export function calcularDiasMora(fechaBaseMora: string, fechaCorte: string): number {
  const base = new Date(fechaBaseMora).getTime();
  const corte = new Date(fechaCorte).getTime();
  return Math.max(0, Math.round((corte - base) / MS_PER_DAY));
}

/**
 * CCAL-007 — Interés = Capital × DTF mensual × (días de mora del mes / días del mes), sumado mes a mes
 * (regla temporal de Flujo_Modulo_Financiero_CPPv2). Cada mes tocado por el período de mora usa la tasa
 * DTF (efectiva anual) vigente EN ESE MES — no solo la tasa actual — convertida a su equivalente mensual.
 */
export function calcularInteresMora(
  capital: number,
  tasasDtf: readonly TasaDtfVigencia[],
  fechaBaseMora: string,
  fechaCorte: string,
): number {
  const diasMoraTotal = calcularDiasMora(fechaBaseMora, fechaCorte);
  if (diasMoraTotal <= 0 || tasasDtf.length === 0) {
    return 0;
  }

  const tasasOrdenadas = [...tasasDtf].sort((a, b) => a.vigenciaInicial.localeCompare(b.vigenciaInicial));
  let interesAcumulado = 0;
  let cursor = new Date(fechaBaseMora);
  const fin = new Date(fechaCorte);

  while (cursor.getTime() < fin.getTime()) {
    const finDeMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const finDeSegmento = finDeMes.getTime() < fin.getTime() ? finDeMes : fin;
    const diasDeMoraEnElMes = Math.round((finDeSegmento.getTime() - cursor.getTime()) / MS_PER_DAY);
    const diasDelMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
    const tasaAnual = tasaVigenteEn(tasasOrdenadas, cursor.toISOString().slice(0, 10));
    const tasaMensual = Math.pow(1 + tasaAnual / 100, 1 / 12) - 1;

    interesAcumulado += capital * tasaMensual * (diasDeMoraEnElMes / diasDelMes);
    cursor = finDeSegmento;
  }

  return Math.round(interesAcumulado);
}

function tasaVigenteEn(tasasOrdenadasAsc: readonly TasaDtfVigencia[], fechaIso: string): number {
  for (let i = tasasOrdenadasAsc.length - 1; i >= 0; i -= 1) {
    if (tasasOrdenadasAsc[i].vigenciaInicial <= fechaIso) {
      return tasasOrdenadasAsc[i].tasaValor;
    }
  }
  return tasasOrdenadasAsc[0].tasaValor;
}
