import { Injectable, inject, signal } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { todayIso } from '../../shared/utils/date';
import ACUERDOS_SEED from '../../fake_data/acuerdos.json';
import DESEMBOLSOS_SEED from '../../fake_data/desembolsos-fonpet.json';
import { EntidadesService } from '../entidades/entidades.service';
import {
  AcuerdoFonpet,
  AcuerdoFormValue,
  DesembolsoFonpet,
  DesembolsoFormValue,
  EstadoAcuerdo,
} from './models/acuerdo.model';

const ESTADO_VARIANT: Record<EstadoAcuerdo, TableBadgeVariant> = {
  Borrador: 'neutral',
  Aprobado: 'info',
  'En Ejecución': 'warning',
  Cumplido: 'success',
  Incumplido: 'danger',
};

const SESSION_USER = 'admin@sgdp.gov.co';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class AcuerdosService {
  private readonly entidadesService = inject(EntidadesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _acuerdos = signal<AcuerdoFonpet[]>(ACUERDOS_SEED as AcuerdoFonpet[]);
  readonly acuerdos = this._acuerdos.asReadonly();

  private readonly _desembolsos = signal<DesembolsoFonpet[]>(DESEMBOLSOS_SEED as DesembolsoFonpet[]);
  readonly desembolsos = this._desembolsos.asReadonly();

  private correlativoAcuerdo = this._acuerdos().length;
  private correlativoDesembolso = this._desembolsos().length;

  getById(idAcuerdo: string): AcuerdoFonpet | undefined {
    return this._acuerdos().find((a) => a.idAcuerdo === idAcuerdo);
  }

  getDesembolsoById(idDesembolso: string): DesembolsoFonpet | undefined {
    return this._desembolsos().find((d) => d.idDesembolso === idDesembolso);
  }

  desembolsosDe(acuerdoId: string): readonly DesembolsoFonpet[] {
    return this._desembolsos().filter((d) => d.acuerdoId === acuerdoId);
  }

  /** CCAL-012 aplicado al acuerdo: total desembolsado a la fecha. */
  valorDesembolsado(acuerdoId: string): number {
    return this.desembolsosDe(acuerdoId).reduce((sum, d) => sum + d.valor, 0);
  }

  saldoPorDesembolsar(acuerdo: AcuerdoFonpet): number {
    return Math.max(0, acuerdo.valorAprobado - this.valorDesembolsado(acuerdo.idAcuerdo));
  }

  /** HU-019 — registra un acuerdo de pago FONPET ya aprobado, asociado a una o varias obligaciones. */
  registrarAcuerdo(value: AcuerdoFormValue): AcuerdoFonpet {
    const entidad = this.entidadesService.getEntidadById(value.entidadId);
    const now = todayIso();

    const nuevo: AcuerdoFonpet = {
      idAcuerdo: this.nextIdAcuerdo(),
      entidadId: value.entidadId,
      entidad: entidad?.nombre ?? value.entidadId,
      cuentaCobroIds: value.cuentaCobroIds,
      valorAprobado: value.valorAprobado,
      valorAprobadoLabel: this.formatCurrency(value.valorAprobado),
      fechaAprobacion: value.fechaAprobacion,
      soporte: value.soporte,
      estado: { label: 'Aprobado', variant: ESTADO_VARIANT.Aprobado },
      historialEstados: [{ estado: 'Aprobado', fecha: now, registradoPor: SESSION_USER }],
      creadoPor: SESSION_USER,
    };

    this._acuerdos.update((list) => [nuevo, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Acuerdos FONPET',
      accion: 'Registrar',
      entidadAfectada: `Acuerdo ${nuevo.idAcuerdo} (${nuevo.entidad})`,
      detalle: `Registro de acuerdo de pago FONPET por ${nuevo.valorAprobadoLabel}.`,
    });
    return nuevo;
  }

  /** HU-021 — registra un desembolso sobre un acuerdo aprobado; lo pasa a "En Ejecución" si aplica. */
  registrarDesembolso(value: DesembolsoFormValue): DesembolsoFonpet {
    const acuerdo = this.getById(value.acuerdoId);
    if (!acuerdo) {
      throw new Error(`No existe el acuerdo ${value.acuerdoId}.`);
    }
    const disponible = this.saldoPorDesembolsar(acuerdo);
    if (value.valor <= 0 || value.valor > disponible) {
      throw new Error(
        'El valor del desembolso debe ser mayor a cero y no puede superar el saldo aprobado por desembolsar.',
      );
    }

    const nuevo: DesembolsoFonpet = {
      idDesembolso: this.nextIdDesembolso(),
      acuerdoId: acuerdo.idAcuerdo,
      entidadId: acuerdo.entidadId,
      entidad: acuerdo.entidad,
      tipo: value.tipo,
      valor: value.valor,
      valorLabel: this.formatCurrency(value.valor),
      fecha: value.fecha,
      soporte: value.soporte,
      registradoPor: SESSION_USER,
    };

    this._desembolsos.update((list) => [nuevo, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Acuerdos FONPET',
      accion: 'Registrar Desembolso',
      entidadAfectada: `Desembolso ${nuevo.idDesembolso} (Acuerdo ${acuerdo.idAcuerdo})`,
      detalle: `Registro de desembolso ${nuevo.tipo.toLowerCase()} por ${nuevo.valorLabel}.`,
    });
    if (acuerdo.estado.label === 'Aprobado') {
      this.cambiarEstado(acuerdo.idAcuerdo, 'En Ejecución');
    }
    return nuevo;
  }

  /** Registra un cambio de estado del acuerdo y lo suma al histórico de seguimiento (HU-019/020). */
  cambiarEstado(idAcuerdo: string, estado: EstadoAcuerdo): void {
    const now = todayIso();
    this._acuerdos.update((list) =>
      list.map((a) =>
        a.idAcuerdo === idAcuerdo
          ? {
              ...a,
              estado: { label: estado, variant: ESTADO_VARIANT[estado] },
              historialEstados: [{ estado, fecha: now, registradoPor: SESSION_USER }, ...a.historialEstados],
            }
          : a,
      ),
    );
    this.auditoriaService.registrar({
      modulo: 'Acuerdos FONPET',
      accion: 'Cambiar Estado',
      entidadAfectada: `Acuerdo ${idAcuerdo}`,
      detalle: `Cambio de estado a "${estado}".`,
    });
  }

  private nextIdAcuerdo(): string {
    this.correlativoAcuerdo += 1;
    return `ACU-${new Date().getFullYear()}-${String(this.correlativoAcuerdo).padStart(3, '0')}`;
  }

  private nextIdDesembolso(): string {
    this.correlativoDesembolso += 1;
    return `DES-${new Date().getFullYear()}-${String(this.correlativoDesembolso).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
