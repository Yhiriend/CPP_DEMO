export type ImputacionTabId = 'pendientes' | 'desembolsos' | 'saldos-a-favor' | 'historico';

export interface ImputacionTab {
  readonly id: ImputacionTabId;
  readonly label: string;
}

export const IMPUTACION_TABS: readonly ImputacionTab[] = [
  { id: 'pendientes', label: 'Pagos Pendientes de Imputar' },
  { id: 'desembolsos', label: 'Desembolsos FONPET Pendientes' },
  { id: 'saldos-a-favor', label: 'Saldos a Favor' },
  { id: 'historico', label: 'Histórico de Imputaciones' },
];
