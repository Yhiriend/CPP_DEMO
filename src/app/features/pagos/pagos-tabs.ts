export type PagoTabId = 'todos' | 'pendientes' | 'aplicados' | 'fonpet' | 'recursos-propios';

export interface PagoTab {
  readonly id: PagoTabId;
  readonly label: string;
}

export const PAGOS_TABS: readonly PagoTab[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes de Aplicar' },
  { id: 'aplicados', label: 'Aplicados' },
  { id: 'fonpet', label: 'Pagos FONPET' },
  { id: 'recursos-propios', label: 'Recursos Propios' },
];
