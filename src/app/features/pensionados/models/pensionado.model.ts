import { TableBadge } from '../../../shared/ui/table/table.model';

export type TipoDocumento = 'C.C.' | 'C.E.' | 'T.I.';
export type EstadoPensionado = 'Activo' | 'Inactivo' | 'Suspendido' | 'Fallecido';

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = ['C.C.', 'C.E.', 'T.I.'];
export const ESTADOS_PENSIONADO: readonly EstadoPensionado[] = ['Activo', 'Inactivo', 'Suspendido', 'Fallecido'];

export interface Pensionado {
  readonly id: string;
  readonly tipoDocumento: TableBadge;
  readonly numeroDocumento: string;
  readonly nombresApellidos: string;
  readonly entidadId: string;
  readonly entidadPrincipal: string;
  readonly estado: TableBadge;
}

export interface PensionadoFormValue {
  readonly tipoDocumento: TipoDocumento;
  readonly numeroDocumento: string;
  readonly nombresApellidos: string;
  readonly entidadId: string;
  readonly estado: EstadoPensionado;
}
