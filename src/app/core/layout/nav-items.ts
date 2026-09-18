import { NavItem } from './nav-item.model';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', implemented: true },
  { label: 'Parametrización', path: '/parametrizacion', icon: 'settings', implemented: true },
  { label: 'Entidades', path: '/entidades', icon: 'building-2', implemented: true },
  { label: 'Pensionados', path: '/pensionados', icon: 'id-card', implemented: true },
  { label: 'Cartera', path: '/cartera', icon: 'wallet', implemented: true },
  { label: 'Pagos', path: '/pagos', icon: 'credit-card', implemented: true },
  { label: 'Imputaciones', path: '/imputaciones', icon: 'arrow-left-right', implemented: true },
  { label: 'Liquidaciones', path: '/liquidaciones', icon: 'file-check-2', implemented: true },
  { label: 'Acuerdos', path: '/acuerdos', icon: 'handshake', implemented: true },
  { label: 'Intereses', path: '/intereses', icon: 'percent', implemented: true },
  { label: 'Cuentas de Cobro', path: '/cuentas-de-cobro', icon: 'file-text', implemented: true },
  { label: 'Cuentas por Pagar', path: '/cuentas-por-pagar', icon: 'banknote', implemented: true },
  { label: 'Usuarios', path: '/usuarios', icon: 'users' },
  { label: 'Reportes', path: '/reportes', icon: 'bar-chart-3', implemented: true },
  { label: 'Alertas', path: '/alertas', icon: 'bell', implemented: true },
  { label: 'Conciliación', path: '/conciliacion', icon: 'git-compare', implemented: true },
  { label: 'Gestión Jurídica', path: '/juridica', icon: 'gavel', implemented: true },
  { label: 'Sincronización', path: '/sincronizacion', icon: 'refresh-cw' },
];
