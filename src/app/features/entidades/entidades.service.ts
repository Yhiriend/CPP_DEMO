import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { nowTimestamp, todayIso } from '../../shared/utils/date';
import { uniqueSlug } from '../../shared/utils/slug';
import OBLIGACIONES_POR_ENTIDAD from '../../fake_data/obligaciones-cartera.json';
import ENTIDADES_SEED from '../../fake_data/entidades.json';
import { Entidad, EntidadFormValue, ObligacionCartera } from './models/entidad.model';

const ESTADO_VARIANT: Record<EntidadFormValue['estado'], TableBadgeVariant> = {
  Activa: 'success',
  Inactiva: 'neutral',
  Revisión: 'warning',
};

const SESSION_USER = 'admin@sgdp.gov.co';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class EntidadesService {
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _entidades = persistedSignal<Entidad[]>('entidades', ENTIDADES_SEED as Entidad[]);
  readonly entidades = this._entidades.asReadonly();

  getEntidadById(id: string): Entidad | undefined {
    return this._entidades().find((entidad) => entidad.id === id);
  }

  getObligaciones(entidadId: string): readonly ObligacionCartera[] {
    const obligaciones = (OBLIGACIONES_POR_ENTIDAD as Record<string, ObligacionCartera[]>)[entidadId];
    return obligaciones ?? [];
  }

  existsNit(nit: string, excludeId?: string): boolean {
    return this._entidades().some((entidad) => entidad.codigoNit === nit && entidad.id !== excludeId);
  }

  createEntidad(value: EntidadFormValue): void {
    const id = uniqueSlug(value.nombre, (candidate) =>
      this._entidades().some((entidad) => entidad.id === candidate),
    );
    const now = todayIso();

    const nueva: Entidad = {
      id,
      codigoNit: value.codigoNit,
      nombre: value.nombre,
      tipo: value.tipo,
      totalPensionados: '0',
      saldoCarteraTotal: '$0',
      estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
      deudaTotalActual: '$0',
      ultimoPago: '—',
      creadoPor: SESSION_USER,
      fechaCreacion: now,
      ultimaModificacion: nowTimestamp(),
      modificadoPor: SESSION_USER,
    };

    this._entidades.update((list) => [nueva, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Entidades',
      accion: 'Crear',
      entidadAfectada: `Entidad ${nueva.nombre} (${nueva.id})`,
      detalle: `Creación de entidad concurrente NIT ${nueva.codigoNit}.`,
    });
  }

  updateEntidad(id: string, value: EntidadFormValue): void {
    this._entidades.update((list) =>
      list.map((entidad) =>
        entidad.id === id
          ? {
              ...entidad,
              codigoNit: value.codigoNit,
              nombre: value.nombre,
              tipo: value.tipo,
              estado: { label: value.estado, variant: ESTADO_VARIANT[value.estado] },
              ultimaModificacion: nowTimestamp(),
              modificadoPor: SESSION_USER,
            }
          : entidad,
      ),
    );
    this.auditoriaService.registrar({
      modulo: 'Entidades',
      accion: 'Editar',
      entidadAfectada: `Entidad ${value.nombre} (${id})`,
      detalle: `Actualización de datos de la entidad.`,
    });
  }

  activar(id: string): void {
    this.setEstado(id, 'Activa');
  }

  inactivar(id: string): void {
    this.setEstado(id, 'Inactiva');
  }

  bulkCreate(values: readonly EntidadFormValue[]): void {
    for (const value of values) {
      this.createEntidad(value);
    }
  }

  private setEstado(id: string, estado: EntidadFormValue['estado']): void {
    this._entidades.update((list) =>
      list.map((entidad) =>
        entidad.id === id
          ? {
              ...entidad,
              estado: { label: estado, variant: ESTADO_VARIANT[estado] },
              ultimaModificacion: nowTimestamp(),
              modificadoPor: SESSION_USER,
            }
          : entidad,
      ),
    );
  }
}
