export interface PensionadoDetailTab {
  readonly id: string;
  readonly label: string;
  readonly implemented?: boolean;
}

export const PENSIONADO_DETAIL_TABS: readonly PensionadoDetailTab[] = [
  { id: 'informacion-general', label: 'Información General' },
  { id: 'beneficiarios', label: 'Beneficiarios', implemented: true },
  { id: 'liquidaciones', label: 'Liquidaciones' },
  { id: 'cartera', label: 'Cartera' },
  { id: 'pagos', label: 'Pagos' },
];
