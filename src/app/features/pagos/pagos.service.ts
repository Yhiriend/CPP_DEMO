import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import PAGOS_SEED from '../../fake_data/pagos.json';
import { EntidadesService } from '../entidades/entidades.service';
import { PagoFormValue, PagoRecibido } from './models/pago.model';

const SESSION_USER = 'admin@sgdp.gov.co';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly entidadesService = inject(EntidadesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _pagos = persistedSignal<PagoRecibido[]>('pagos', PAGOS_SEED as PagoRecibido[]);
  readonly pagos = this._pagos.asReadonly();

  private correlativo = this._pagos().length;

  getById(idTransaccion: string): PagoRecibido | undefined {
    return this._pagos().find((pago) => pago.idTransaccion === idTransaccion);
  }

  /** HU-012/013/014 — registra un pago recibido, ya con su fuente (HU-014) y, si aplica, la obligación identificada. */
  registrarPago(value: PagoFormValue): PagoRecibido {
    const entidad = this.entidadesService.getEntidadById(value.entidadId);

    const nuevo: PagoRecibido = {
      idTransaccion: this.nextId(),
      entidadId: value.entidadId,
      entidad: entidad?.nombre ?? value.entidadId,
      cuentaCobroId: value.cuentaCobroId,
      origen: { label: value.origen, variant: 'neutral' },
      tipo: value.tipo,
      montoRecibido: value.montoRecibido,
      montoRecibidoLabel: this.formatCurrency(value.montoRecibido),
      fecha: value.fecha,
      soporte: value.soporte,
      creadoPor: SESSION_USER,
    };

    this._pagos.update((list) => [nuevo, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Pagos',
      accion: 'Registrar',
      entidadAfectada: `Pago ${nuevo.idTransaccion} (${nuevo.entidad})`,
      detalle: `Registro de pago por ${nuevo.montoRecibidoLabel}, fuente ${nuevo.origen.label}.`,
    });
    return nuevo;
  }

  private nextId(): string {
    this.correlativo += 1;
    return `PAG-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
