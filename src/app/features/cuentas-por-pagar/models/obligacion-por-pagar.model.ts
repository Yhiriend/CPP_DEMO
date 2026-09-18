import { TableBadge } from '../../../shared/ui/table/table.model';

/**
 * El flujo "por pagar" del Módulo Financiero: SCPP le debe una cuota parte a una
 * entidad acreedora (el espejo de Cuentas de Cobro, donde una entidad nos debe a
 * nosotros). Es una cadena de aprobación secuencial entre 4 áreas — no se puede saltar
 * un paso.
 */
export type EstadoObligacionPorPagar = 'Registrada' | 'Validada' | 'Aprobada Financiera' | 'Causada' | 'Pagada' | 'Rechazada';

/** El "camino feliz", en orden — Rechazada es un estado terminal alterno, no parte de la secuencia. */
export const FLUJO_OBLIGACION_POR_PAGAR: readonly EstadoObligacionPorPagar[] = [
  'Registrada',
  'Validada',
  'Aprobada Financiera',
  'Causada',
  'Pagada',
];

export interface SoporteObligacionPorPagar {
  readonly nombreArchivo: string;
  readonly fechaCargue: string;
}

/** Área del carril del diagrama responsable de cada paso. */
export interface RegistroEstadoObligacionPorPagar {
  readonly estado: EstadoObligacionPorPagar;
  readonly area: string;
  readonly fecha: string;
  readonly usuario: string;
  readonly observacion: string | null;
}

export interface ObligacionPorPagar {
  readonly id: string;
  readonly entidadAcreedoraId: string;
  readonly entidadAcreedora: string;
  readonly pensionado: string;
  readonly numeroDocumentoPensionado: string;
  readonly periodo: string;
  /** CCAL-001, en sentido inverso — mismo concepto de concurrencia. */
  readonly porcentajeConcurrencia: number;
  readonly valorMesadaPensional: number;
  /** CCAL-002 — valor cuota parte a pagar. */
  readonly valor: number;
  readonly valorLabel: string;
  readonly soporte: SoporteObligacionPorPagar | null;
  readonly estado: TableBadge;
  readonly historialEstados: readonly RegistroEstadoObligacionPorPagar[];
  readonly fechaRegistro: string;
  readonly fechaPago: string | null;
  readonly registradoPor: string;
}

export interface RegistrarObligacionPorPagarValue {
  readonly entidadAcreedoraId: string;
  readonly pensionado: string;
  readonly numeroDocumentoPensionado: string;
  readonly periodo: string;
  readonly diasEntidad: number;
  readonly totalDiasPension: number;
  readonly valorMesadaPensional: number;
  readonly soporte: SoporteObligacionPorPagar | null;
}
