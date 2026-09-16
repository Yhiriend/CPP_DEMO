/** CCAL-001 — % Concurrencia = (Días entidad / Total días pensión) × 100. */
export function calcularPorcentajeConcurrencia(diasEntidad: number, totalDiasPension: number): number {
  if (totalDiasPension <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((diasEntidad / totalDiasPension) * 10_000) / 100);
}

/** CCAL-002 — Valor cuota parte = Valor mesada pensional × % concurrencia. */
export function calcularValorCuotaParte(valorMesadaPensional: number, porcentajeConcurrencia: number): number {
  return Math.round(valorMesadaPensional * (porcentajeConcurrencia / 100));
}
