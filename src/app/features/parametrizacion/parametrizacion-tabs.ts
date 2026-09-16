export interface ParametrizacionTab {
  readonly id: string;
  readonly label: string;
  readonly implemented?: boolean;
}

export const PARAMETRIZACION_TABS: readonly ParametrizacionTab[] = [
  { id: 'dtf-rate-settings', label: 'DTF Rate Settings', implemented: true },
  { id: 'entity-types', label: 'Entity Types' },
  { id: 'payment-types', label: 'Payment Types' },
  { id: 'status-configurations', label: 'Status Configurations' },
  { id: 'billing-concepts', label: 'Billing Concepts' },
  { id: 'interest-rule-settings', label: 'Interest Rule Settings' },
];
