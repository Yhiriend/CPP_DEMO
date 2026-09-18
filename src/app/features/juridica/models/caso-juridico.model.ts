import { TableBadge } from '../../../shared/ui/table/table.model';

export type EstadoCasoJuridico =
  | 'Radicado'
  | 'Requerimiento Enviado'
  | 'Objeción en Trámite'
  | 'Proceso de Cobro Coactivo'
  | 'Acuerdo de Pago'
  | 'Objeción Aceptada'
  | 'Pagado'
  | 'Archivado';

/**
 * Camino feliz lineal (Avanzar). 'Pagado' no está aquí: se cierra aparte (cerrarPagado) porque el deudor
 * puede pagar en cualquier punto del proceso, no solo tras un Acuerdo de Pago. 'Objeción en Trámite',
 * 'Objeción Aceptada' y 'Archivado' son ramas fuera de este flujo.
 */
export const FLUJO_CASO_JURIDICO: readonly EstadoCasoJuridico[] = [
  'Radicado',
  'Requerimiento Enviado',
  'Proceso de Cobro Coactivo',
  'Acuerdo de Pago',
];

export const ESTADOS_TERMINALES_CASO: readonly EstadoCasoJuridico[] = ['Objeción Aceptada', 'Pagado', 'Archivado'];

export type TipoActuacion =
  | 'Radicación'
  | 'Requerimiento de Pago'
  | 'Objeción Recibida'
  | 'Objeción Resuelta'
  | 'Cobro Coactivo'
  | 'Acuerdo de Pago'
  | 'Cierre'
  | 'Actuación Manual';

export interface Actuacion {
  readonly id: string;
  readonly fecha: string;
  readonly tipo: TipoActuacion;
  readonly descripcion: string;
  readonly responsable: string;
}

export type EstadoObjecion = 'Pendiente' | 'Aceptada' | 'Rechazada';

export interface Objecion {
  readonly id: string;
  readonly fecha: string;
  readonly motivo: string;
  readonly radicadaPor: string;
  readonly estado: EstadoObjecion;
  readonly fechaResolucion: string | null;
  readonly resolucionMotivo: string | null;
}

export interface CasoJuridico {
  readonly id: string;
  readonly cuentaCobroId: string;
  readonly entidadId: string;
  readonly entidad: string;
  readonly valor: number;
  readonly valorLabel: string;
  readonly fechaVencimientoCuenta: string;
  readonly fechaRadicacion: string;
  readonly estado: TableBadge;
  readonly historial: readonly Actuacion[];
  readonly objeciones: readonly Objecion[];
  readonly responsable: string;
}

export interface RadicarCasoValue {
  readonly cuentaCobroId: string;
}

export interface RegistrarActuacionValue {
  readonly descripcion: string;
}

export interface RegistrarObjecionValue {
  readonly motivo: string;
  readonly radicadaPor: string;
}

export interface ResolverObjecionValue {
  readonly aceptar: boolean;
  readonly motivo: string;
}

export interface RegistrarAcuerdoPagoValue {
  readonly descripcion: string;
}

export interface ArchivarCasoValue {
  readonly motivo: string;
}
