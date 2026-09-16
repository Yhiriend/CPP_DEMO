export interface EntidadDetailTab {
  readonly id: string;
  readonly label: string;
  readonly implemented?: boolean;
}

export const ENTIDAD_DETAIL_TABS: readonly EntidadDetailTab[] = [
  { id: 'informacion-general', label: 'Información General' },
  { id: 'pensionados', label: 'Pensionados' },
  { id: 'liquidaciones', label: 'Liquidaciones' },
  { id: 'cuentas-de-cobro', label: 'Cuentas de Cobro' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'acuerdos-fonpet', label: 'Acuerdos FONPET' },
  { id: 'cartera-estado-cuenta', label: 'Cartera / Estado de Cuenta', implemented: true },
];
