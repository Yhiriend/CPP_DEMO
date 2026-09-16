import { Injectable, signal } from '@angular/core';

import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { uniqueSlug } from '../../shared/utils/slug';
import BENEFICIARIOS_SEED from '../../fake_data/beneficiarios.json';
import { Beneficiario, BeneficiarioFormValue, EstadoBeneficiario } from './models/beneficiario.model';

const ESTADO_VARIANT: Record<EstadoBeneficiario, TableBadgeVariant> = {
  Activo: 'success',
  Inactivo: 'neutral',
};

const TIPO_DOCUMENTO_VARIANT: TableBadgeVariant = 'neutral';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class BeneficiariosService {
  private readonly _beneficiarios = signal<Beneficiario[]>(BENEFICIARIOS_SEED as Beneficiario[]);
  readonly beneficiarios = this._beneficiarios.asReadonly();

  getByPensionado(pensionadoId: string): readonly Beneficiario[] {
    return this._beneficiarios().filter((beneficiario) => beneficiario.pensionadoId === pensionadoId);
  }

  existsDocumento(numeroDocumento: string, excludeId?: string): boolean {
    return this._beneficiarios().some(
      (beneficiario) => beneficiario.numeroDocumento === numeroDocumento && beneficiario.id !== excludeId,
    );
  }

  createBeneficiario(pensionadoId: string, value: BeneficiarioFormValue): void {
    const id = uniqueSlug(value.nombresApellidos, (candidate) =>
      this._beneficiarios().some((beneficiario) => beneficiario.id === candidate),
    );

    const nuevo: Beneficiario = {
      id,
      pensionadoId,
      tipoDocumento: { label: value.tipoDocumento, variant: TIPO_DOCUMENTO_VARIANT },
      numeroDocumento: value.numeroDocumento,
      nombresApellidos: value.nombresApellidos,
      parentesco: value.parentesco,
      estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
    };

    this._beneficiarios.update((list) => [nuevo, ...list]);
  }

  updateBeneficiario(id: string, value: BeneficiarioFormValue): void {
    this._beneficiarios.update((list) =>
      list.map((beneficiario) =>
        beneficiario.id === id
          ? {
              ...beneficiario,
              tipoDocumento: { label: value.tipoDocumento, variant: TIPO_DOCUMENTO_VARIANT },
              numeroDocumento: value.numeroDocumento,
              nombresApellidos: value.nombresApellidos,
              parentesco: value.parentesco,
              estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
            }
          : beneficiario,
      ),
    );
  }

  activar(id: string): void {
    this.setEstado(id, 'Activo');
  }

  inactivar(id: string): void {
    this.setEstado(id, 'Inactivo');
  }

  private setEstado(id: string, estado: EstadoBeneficiario): void {
    this._beneficiarios.update((list) =>
      list.map((beneficiario) =>
        beneficiario.id === id
          ? { ...beneficiario, estado: { label: estado, variant: ESTADO_VARIANT[estado] } }
          : beneficiario,
      ),
    );
  }
}
