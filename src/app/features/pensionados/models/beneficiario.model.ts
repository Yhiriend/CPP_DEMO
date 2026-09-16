import { TableBadge } from '../../../shared/ui/table/table.model';
import { TipoDocumento } from './pensionado.model';

export type EstadoBeneficiario = 'Activo' | 'Inactivo';
export type Parentesco = 'Cónyuge' | 'Compañero(a) Permanente' | 'Hijo/a' | 'Padre/Madre' | 'Otro';

export const PARENTESCOS: readonly Parentesco[] = [
  'Cónyuge',
  'Compañero(a) Permanente',
  'Hijo/a',
  'Padre/Madre',
  'Otro',
];
export const ESTADOS_BENEFICIARIO: readonly EstadoBeneficiario[] = ['Activo', 'Inactivo'];

export interface Beneficiario {
  readonly id: string;
  readonly pensionadoId: string;
  readonly tipoDocumento: TableBadge;
  readonly numeroDocumento: string;
  readonly nombresApellidos: string;
  readonly parentesco: string;
  readonly estado: TableBadge;
}

export interface BeneficiarioFormValue {
  readonly tipoDocumento: TipoDocumento;
  readonly numeroDocumento: string;
  readonly nombresApellidos: string;
  readonly parentesco: Parentesco;
  readonly estado: EstadoBeneficiario;
}
