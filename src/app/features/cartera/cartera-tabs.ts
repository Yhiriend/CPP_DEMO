export type CarteraTabId =
  | 'estado-cuenta-general'
  | 'cartera-por-entidad'
  | 'cartera-por-pensionado'
  | 'cartera-vencida'
  | 'intereses-generados'
  | 'historico-movimientos';

export interface CarteraTab {
  readonly id: CarteraTabId;
  readonly label: string;
}

export const CARTERA_TABS: readonly CarteraTab[] = [
  { id: 'estado-cuenta-general', label: 'Estado de Cuenta General' },
  { id: 'cartera-por-entidad', label: 'Cartera por Entidad' },
  { id: 'cartera-por-pensionado', label: 'Cartera por Pensionado' },
  { id: 'cartera-vencida', label: 'Cartera Vencida' },
  { id: 'intereses-generados', label: 'Intereses Generados' },
  { id: 'historico-movimientos', label: 'Histórico de Movimientos' },
];
