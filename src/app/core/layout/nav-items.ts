import { NavItem } from './nav-item.model';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', implemented: true },
  { label: 'Parametrización', path: '/parametrizacion', icon: 'settings', implemented: true },
  { label: 'Entidades', path: '/entidades', icon: 'building-2', implemented: true },
  { label: 'Cartera', path: '/cartera', icon: 'wallet', implemented: true },
  { label: 'Pagos', path: '/pagos', icon: 'credit-card', implemented: true },
  { label: 'Imputaciones', path: '/imputaciones', icon: 'arrow-left-right' },
  { label: 'Liquidaciones', path: '/liquidaciones', icon: 'file-check-2', implemented: true },
  { label: 'FONPET', path: '/fonpet', icon: 'landmark' },
  { label: 'FONCEP', path: '/foncep', icon: 'piggy-bank' },
  { label: 'Acuerdos', path: '/acuerdos', icon: 'handshake', implemented: true },
  { label: 'Intereses', path: '/intereses', icon: 'percent' },
  { label: 'Cuentas de Cobro', path: '/cuentas-de-cobro', icon: 'file-text', implemented: true },
  { label: 'Usuarios', path: '/usuarios', icon: 'users' },
  { label: 'Reportes', path: '/reportes', icon: 'bar-chart-3' },
  { label: 'Alertas', path: '/alertas', icon: 'bell' },
  { label: 'Sincronización', path: '/sincronizacion', icon: 'refresh-cw' },
];
