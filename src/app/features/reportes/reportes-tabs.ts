export type ReportesTabId = 'generar' | 'auditoria';

export interface ReportesTab {
  readonly id: ReportesTabId;
  readonly label: string;
}

export const REPORTES_TABS: readonly ReportesTab[] = [
  { id: 'generar', label: 'Generar Reportes' },
  { id: 'auditoria', label: 'Auditoría y Trazabilidad' },
];
