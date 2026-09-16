import { NavItem } from './nav-item.model';

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard', implemented: true },
  { label: 'Parametrización', path: '/parametrizacion', icon: 'settings', implemented: true },
  { label: 'Entidades', path: '/entidades', icon: 'building-2' },
  { label: 'Cartera', path: '/cartera', icon: 'wallet' },
  { label: 'Pagos', path: '/pagos', icon: 'credit-card' },
  { label: 'Imputaciones', path: '/imputaciones', icon: 'arrow-left-right' },
  { label: 'Liquidaciones', path: '/liquidaciones', icon: 'file-check-2' },
  { label: 'FONPET', path: '/fonpet', icon: 'landmark' },
  { label: 'FONCEP', path: '/foncep', icon: 'piggy-bank' },
  { label: 'Acuerdos', path: '/acuerdos', icon: 'handshake', implemented: true },
  { label: 'Intereses', path: '/intereses', icon: 'percent' },
  { label: 'Usuarios', path: '/usuarios', icon: 'users' },
  { label: 'Reportes', path: '/reportes', icon: 'bar-chart-3' },
  { label: 'Alertas', path: '/alertas', icon: 'bell' },
  { label: 'Sincronización', path: '/sincronizacion', icon: 'refresh-cw' },
];
