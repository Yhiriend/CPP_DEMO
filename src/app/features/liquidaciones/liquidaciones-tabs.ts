export type LiquidacionTabId = 'todas' | 'por-entidad' | 'por-pensionado';

export interface LiquidacionTab {
  readonly id: LiquidacionTabId;
  readonly label: string;
}

export const LIQUIDACION_TABS: readonly LiquidacionTab[] = [
  { id: 'todas', label: 'Todas las Liquidaciones' },
  { id: 'por-entidad', label: 'Consolidado por Entidad' },
  { id: 'por-pensionado', label: 'Consolidado por Pensionado' },
];
