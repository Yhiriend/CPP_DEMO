import { Injectable } from '@angular/core';

import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { nowTimestamp, todayIso } from '../../shared/utils/date';
import AUDITORIA_SEED from '../../fake_data/auditoria.json';
import { EventoAuditoria, RegistrarEventoInput } from './models/evento-auditoria.model';

const SESSION_USER = 'admin@sgdp.gov.co';

/**
 * HU-032 — registro de trazabilidad de operaciones. Es infraestructura pura (sin
 * dependencias hacia otros servicios de dominio), así que cualquier servicio puede
 * inyectarla sin riesgo de ciclos. Los eventos no se pueden editar ni eliminar,
 * solo agregar y consultar.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly _eventos = persistedSignal<EventoAuditoria[]>('auditoria', AUDITORIA_SEED as EventoAuditoria[]);
  readonly eventos = this._eventos.asReadonly();

  private correlativo = this._eventos().length;

  registrar(input: RegistrarEventoInput): void {
    const nuevo: EventoAuditoria = {
      id: this.nextId(),
      fecha: todayIso(),
      timestamp: nowTimestamp(),
      usuario: SESSION_USER,
      modulo: input.modulo,
      accion: input.accion,
      entidadAfectada: input.entidadAfectada,
      detalle: input.detalle,
    };
    this._eventos.update((list) => [nuevo, ...list]);
  }

  private nextId(): string {
    this.correlativo += 1;
    return `AUD-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }
}
