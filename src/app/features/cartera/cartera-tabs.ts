export interface CarteraTab {
  readonly id: string;
  readonly label: string;
  readonly implemented?: boolean;
}

export const CARTERA_TABS: readonly CarteraTab[] = [
  { id: 'estado-cuenta-general', label: 'Estado de Cuenta General', implemented: true },
  { id: 'cartera-por-entidad', label: 'Cartera por Entidad' },
  { id: 'cartera-por-pensionado', label: 'Cartera por Pensionado' },
  { id: 'cartera-vencida', label: 'Cartera Vencida' },
  { id: 'intereses-generados', label: 'Intereses Generados' },
  { id: 'historico-movimientos', label: 'Histórico de Movimientos' },
];
