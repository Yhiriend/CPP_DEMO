export type ModuloAuditoria =
  | 'Entidades'
  | 'Pensionados'
  | 'Liquidaciones'
  | 'Cuentas de Cobro'
  | 'Cuentas por Pagar'
  | 'Pagos'
  | 'Imputaciones'
  | 'Acuerdos FONPET'
  | 'Parametrización';

export const MODULOS_AUDITORIA: readonly ModuloAuditoria[] = [
  'Entidades',
  'Pensionados',
  'Liquidaciones',
  'Cuentas de Cobro',
  'Cuentas por Pagar',
  'Pagos',
  'Imputaciones',
  'Acuerdos FONPET',
  'Parametrización',
];

export interface EventoAuditoria {
  readonly id: string;
  readonly fecha: string;
  readonly timestamp: string;
  readonly usuario: string;
  readonly modulo: ModuloAuditoria;
  readonly accion: string;
  readonly entidadAfectada: string;
  readonly detalle: string;
}

export interface RegistrarEventoInput {
  readonly modulo: ModuloAuditoria;
  readonly accion: string;
  readonly entidadAfectada: string;
  readonly detalle: string;
}
