export type ImputacionTabId = 'pendientes' | 'desembolsos' | 'historico';

export interface ImputacionTab {
  readonly id: ImputacionTabId;
  readonly label: string;
}

export const IMPUTACION_TABS: readonly ImputacionTab[] = [
  { id: 'pendientes', label: 'Pagos Pendientes de Imputar' },
  { id: 'desembolsos', label: 'Desembolsos FONPET Pendientes' },
  { id: 'historico', label: 'Histórico de Imputaciones' },
];
