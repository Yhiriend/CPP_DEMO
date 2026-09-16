import { DashboardStat, EntityDebt, PaymentEntry, QuickAction } from '../models/dashboard.model';

export const DASHBOARD_STATS: readonly DashboardStat[] = [
  { label: 'Cartera Total', value: '$4,823,500M', icon: 'wallet', trendLabel: '— vs anterior' },
  { label: 'Intereses Generados', value: '$312,400M', icon: 'trending-up', trendLabel: '— vs anterior' },
  { label: 'Pagos Pendientes de Imputar', value: '47', icon: 'clock', trendLabel: '— vs anterior' },
  { label: 'Acuerdos FONPET Pendientes', value: '12', icon: 'file-text', trendLabel: '— vs anterior' },
];

export const ENTITIES_WITH_HIGHEST_DEBT: readonly EntityDebt[] = [
  { name: 'Gobernación Antioquia', percentage: 95 },
  { name: 'Alcaldía Bogotá', percentage: 80 },
  { name: 'Gobernación Valle', percentage: 65 },
  { name: 'Municipio Medellín', percentage: 50 },
  { name: 'Alcaldía Cali', percentage: 35 },
];

export const LATEST_PAYMENTS: readonly PaymentEntry[] = [
  { date: '02 Jun 2026', entity: 'Gobernación Antioquia', amount: '$18,200M' },
  { date: '28 May 2026', entity: 'Alcaldía Cali', amount: '$4,750M' },
  { date: '22 May 2026', entity: 'Municipio Medellín', amount: '$9,100M' },
];

export const OVERDUE_OBLIGATIONS: readonly PaymentEntry[] = [
  { date: '15 May 2026', entity: 'Gobernación Valle', amount: '$31,400M' },
  { date: '01 May 2026', entity: 'Alcaldía Bogotá', amount: '$52,800M' },
  { date: '10 Abr 2026', entity: 'Gobernación Nariño', amount: '$7,600M' },
];

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'Registrar Pago', icon: 'credit-card' },
  { label: 'Generar Liquidación', icon: 'file-check-2' },
  { label: 'Nueva Imputación', icon: 'arrow-left-right' },
];
