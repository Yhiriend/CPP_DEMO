export type ImputacionTabId = 'pendientes' | 'historico';

export interface ImputacionTab {
  readonly id: ImputacionTabId;
  readonly label: string;
}

export const IMPUTACION_TABS: readonly ImputacionTab[] = [
  { id: 'pendientes', label: 'Pagos Pendientes de Imputar' },
  { id: 'historico', label: 'Histórico de Imputaciones' },
];
