import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { EntidadesService } from '../entidades/entidades.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { uniqueSlug } from '../../shared/utils/slug';
import PENSIONADOS_SEED from '../../fake_data/pensionados.json';
import { EstadoPensionado, Pensionado, PensionadoFormValue } from './models/pensionado.model';

const ESTADO_VARIANT: Record<EstadoPensionado, TableBadgeVariant> = {
  Activo: 'success',
  Inactivo: 'neutral',
  Suspendido: 'warning',
  Fallecido: 'neutral',
};

const TIPO_DOCUMENTO_VARIANT: TableBadgeVariant = 'neutral';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class PensionadosService {
  private readonly entidadesService = inject(EntidadesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _pensionados = persistedSignal<Pensionado[]>('pensionados', PENSIONADOS_SEED as Pensionado[]);
  readonly pensionados = this._pensionados.asReadonly();

  getPensionadoById(id: string): Pensionado | undefined {
    return this._pensionados().find((pensionado) => pensionado.id === id);
  }

  getPensionadoByDocumento(numeroDocumento: string): Pensionado | undefined {
    return this._pensionados().find((pensionado) => pensionado.numeroDocumento === numeroDocumento);
  }

  existsDocumento(numeroDocumento: string, excludeId?: string): boolean {
    return this._pensionados().some(
      (pensionado) => pensionado.numeroDocumento === numeroDocumento && pensionado.id !== excludeId,
    );
  }

  createPensionado(value: PensionadoFormValue): void {
    const id = uniqueSlug(value.nombresApellidos, (candidate) =>
      this._pensionados().some((pensionado) => pensionado.id === candidate),
    );

    const nuevo: Pensionado = {
      id,
      tipoDocumento: { label: value.tipoDocumento, variant: TIPO_DOCUMENTO_VARIANT },
      numeroDocumento: value.numeroDocumento,
      nombresApellidos: value.nombresApellidos,
      entidadId: value.entidadId,
      entidadPrincipal: this.entidadesService.getEntidadById(value.entidadId)?.nombre ?? '—',
      estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
    };

    this._pensionados.update((list) => [nuevo, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Pensionados',
      accion: 'Crear',
      entidadAfectada: `Pensionado ${nuevo.nombresApellidos} (${nuevo.id})`,
      detalle: `Registro de pensionado documento ${nuevo.numeroDocumento}.`,
    });
  }

  updatePensionado(id: string, value: PensionadoFormValue): void {
    this._pensionados.update((list) =>
      list.map((pensionado) =>
        pensionado.id === id
          ? {
              ...pensionado,
              tipoDocumento: { label: value.tipoDocumento, variant: TIPO_DOCUMENTO_VARIANT },
              numeroDocumento: value.numeroDocumento,
              nombresApellidos: value.nombresApellidos,
              entidadId: value.entidadId,
              entidadPrincipal: this.entidadesService.getEntidadById(value.entidadId)?.nombre ?? '—',
              estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
            }
          : pensionado,
      ),
    );
  }

  activar(id: string): void {
    this.setEstado(id, 'Activo');
  }

  inactivar(id: string): void {
    this.setEstado(id, 'Inactivo');
  }

  bulkCreate(values: readonly PensionadoFormValue[]): void {
    for (const value of values) {
      this.createPensionado(value);
    }
  }

  private setEstado(id: string, estado: EstadoPensionado): void {
    this._pensionados.update((list) =>
      list.map((pensionado) =>
        pensionado.id === id
          ? { ...pensionado, estado: { label: estado, variant: ESTADO_VARIANT[estado] } }
          : pensionado,
      ),
    );
  }
}
