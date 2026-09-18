export type SeveridadAlerta = 'Crítica' | 'Alta' | 'Media' | 'Baja';
export const SEVERIDADES_ALERTA: readonly SeveridadAlerta[] = ['Crítica', 'Alta', 'Media', 'Baja'];

export type CategoriaAlerta =
  | 'Vencimiento Próximo'
  | 'Cuenta Vencida'
  | 'Pago Sin Identificar'
  | 'Desembolso FONPET Pendiente'
  | 'Saldo a Favor Sin Aplicar';

export const CATEGORIAS_ALERTA: readonly CategoriaAlerta[] = [
  'Vencimiento Próximo',
  'Cuenta Vencida',
  'Pago Sin Identificar',
  'Desembolso FONPET Pendiente',
  'Saldo a Favor Sin Aplicar',
];

export interface Alerta {
  readonly id: string;
  readonly categoria: CategoriaAlerta;
  readonly severidad: SeveridadAlerta;
  readonly entidadId: string;
  readonly entidad: string;
  readonly detalle: string;
  readonly fechaReferencia: string;
  readonly diasTranscurridos: number;
  /** Módulo y filtro al que navega la acción "Ver" — no hay pantalla propia por alerta. */
  readonly ruta: readonly string[];
}
