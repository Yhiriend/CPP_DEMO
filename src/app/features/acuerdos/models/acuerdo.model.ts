import { TableBadge } from '../../../shared/ui/table/table.model';

export type EstadoAcuerdo = 'Borrador' | 'Aprobado' | 'En Ejecución' | 'Cumplido' | 'Incumplido';
export const ESTADOS_ACUERDO: readonly EstadoAcuerdo[] = [
  'Borrador',
  'Aprobado',
  'En Ejecución',
  'Cumplido',
  'Incumplido',
];

/** Soporte documental XLSX (resoluciones, actos administrativos, certificaciones — HU-019/021). */
export interface SoporteAcuerdo {
  readonly nombreArchivo: string;
  readonly fechaCargue: string;
}

/** Entrada del histórico de estados del acuerdo (HU-019/020 — seguimiento). */
export interface RegistroEstadoAcuerdo {
  readonly estado: EstadoAcuerdo;
  readonly fecha: string;
  readonly registradoPor: string;
}

export interface AcuerdoFonpet {
  readonly idAcuerdo: string;
  readonly entidadId: string;
  readonly entidad: string;
  /** Obligaciones (cuentas de cobro) cubiertas por el acuerdo. */
  readonly cuentaCobroIds: readonly string[];
  readonly valorAprobado: number;
  readonly valorAprobadoLabel: string;
  readonly fechaAprobacion: string;
  readonly soporte: SoporteAcuerdo | null;
  readonly estado: TableBadge;
  readonly historialEstados: readonly RegistroEstadoAcuerdo[];
  readonly creadoPor: string;
}

export interface AcuerdoFormValue {
  readonly entidadId: string;
  readonly cuentaCobroIds: readonly string[];
  readonly valorAprobado: number;
  readonly fechaAprobacion: string;
  readonly soporte: SoporteAcuerdo | null;
}

export type TipoDesembolso = 'Total' | 'Parcial';
export const TIPOS_DESEMBOLSO: readonly TipoDesembolso[] = ['Total', 'Parcial'];

export interface DesembolsoFonpet {
  readonly idDesembolso: string;
  readonly acuerdoId: string;
  readonly entidadId: string;
  readonly entidad: string;
  readonly tipo: TipoDesembolso;
  readonly valor: number;
  readonly valorLabel: string;
  readonly fecha: string;
  readonly soporte: SoporteAcuerdo | null;
  readonly registradoPor: string;
}

export interface DesembolsoFormValue {
  readonly acuerdoId: string;
  readonly tipo: TipoDesembolso;
  readonly valor: number;
  readonly fecha: string;
  readonly soporte: SoporteAcuerdo | null;
}
