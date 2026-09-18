import { Injectable, inject, signal } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { todayIso } from '../../shared/utils/date';
import CONCILIACIONES_SEED from '../../fake_data/conciliaciones.json';
import { AcuerdosService } from '../acuerdos/acuerdos.service';
import { EntidadesService } from '../entidades/entidades.service';
import { PagosService } from '../pagos/pagos.service';
import {
  AjusteConciliacion,
  Conciliacion,
  EstadoConciliacion,
  FuenteConciliacion,
  RegistrarAjusteValue,
  RegistrarConciliacionValue,
} from './models/conciliacion.model';

const ESTADO_VARIANT: Record<EstadoConciliacion, TableBadgeVariant> = {
  Conciliado: 'success',
  'Con Diferencia': 'danger',
  Ajustada: 'info',
};

const SESSION_USER = 'admin@sgdp.gov.co';

/**
 * HU derivada del flujo financiero ampliado — "Conciliar: SIIF, FOPEP, PASIVOCOL,
 * bancos, SCPP" y, si hay diferencias, un ajuste con nota débito/crédito. No hay
 * sistemas externos reales: el valor reportado se registra a mano (como si viniera de
 * un extracto/reporte cargado) y se compara contra lo que Pagos/Acuerdos FONPET ya
 * tienen calculado en vivo para el mismo período.
 */
@Injectable({ providedIn: 'root' })
export class ConciliacionService {
  private readonly pagosService = inject(PagosService);
  private readonly acuerdosService = inject(AcuerdosService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _conciliaciones = signal<Conciliacion[]>(CONCILIACIONES_SEED as Conciliacion[]);
  readonly conciliaciones = this._conciliaciones.asReadonly();

  private correlativo = this._conciliaciones().length;

  getById(id: string): Conciliacion | undefined {
    return this._conciliaciones().find((c) => c.id === id);
  }

  /**
   * SIIF/Bancos ven el recaudo general (Pagos); FOPEP/PASIVOCOL ven específicamente
   * los desembolsos de acuerdos FONPET — es la lectura más fiel posible sin tener
   * esos sistemas reales conectados.
   */
  calcularValorInterno(fuente: FuenteConciliacion, periodo: string, entidadId: string | null): number {
    if (fuente === 'SIIF' || fuente === 'Bancos') {
      return this.pagosService
        .pagos()
        .filter((p) => p.fecha.startsWith(periodo) && (!entidadId || p.entidadId === entidadId))
        .reduce((sum, p) => sum + p.montoRecibido, 0);
    }
    return this.acuerdosService
      .desembolsos()
      .filter((d) => d.fecha.startsWith(periodo) && (!entidadId || d.entidadId === entidadId))
      .reduce((sum, d) => sum + d.valor, 0);
  }

  /** HU — registra el saldo reportado por la fuente externa y genera su conciliación. */
  registrar(value: RegistrarConciliacionValue): Conciliacion {
    if (!value.periodo) {
      throw new Error('Seleccione el período a conciliar.');
    }
    const entidad = value.entidadId ? this.entidadesService.getEntidadById(value.entidadId) : undefined;
    if (value.entidadId && !entidad) {
      throw new Error(`No existe la entidad ${value.entidadId}.`);
    }

    const valorInterno = this.calcularValorInterno(value.fuente, value.periodo, value.entidadId);
    const diferencia = value.valorReportado - valorInterno;
    const ahora = todayIso();

    const nueva: Conciliacion = {
      id: this.nextId(),
      fuente: value.fuente,
      periodo: value.periodo,
      entidadId: value.entidadId,
      entidad: entidad?.nombre ?? 'Todas las entidades',
      valorReportado: value.valorReportado,
      valorReportadoLabel: this.formatCurrency(value.valorReportado),
      valorInterno,
      valorInternoLabel: this.formatCurrency(valorInterno),
      diferencia,
      diferenciaLabel: this.formatCurrency(diferencia),
      soporte: value.soporte,
      estado: { label: diferencia === 0 ? 'Conciliado' : 'Con Diferencia', variant: ESTADO_VARIANT[diferencia === 0 ? 'Conciliado' : 'Con Diferencia'] },
      fechaGeneracion: ahora,
      generadoPor: SESSION_USER,
      ajuste: null,
    };

    this._conciliaciones.update((list) => [nueva, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Conciliación',
      accion: 'Registrar',
      entidadAfectada: `Conciliación ${nueva.id} (${nueva.fuente} · ${nueva.periodo})`,
      detalle: `Conciliación ${nueva.fuente} del período ${nueva.periodo}: reportado ${nueva.valorReportadoLabel} vs. interno ${nueva.valorInternoLabel}.`,
    });
    return nueva;
  }

  /** HU — nota débito/crédito que trata una diferencia (no modifica ningún saldo real, solo la deja resuelta). */
  registrarAjuste(id: string, value: RegistrarAjusteValue): void {
    const conciliacion = this.getById(id);
    if (!conciliacion) {
      throw new Error(`No existe la conciliación ${id}.`);
    }
    if (conciliacion.estado.label !== 'Con Diferencia') {
      throw new Error('Solo se puede registrar un ajuste sobre una conciliación con diferencia pendiente.');
    }
    if (value.valor <= 0) {
      throw new Error('El valor del ajuste debe ser mayor a cero.');
    }
    if (!value.justificacion.trim()) {
      throw new Error('Registre la justificación del ajuste.');
    }

    const ajuste: AjusteConciliacion = {
      tipo: value.tipo,
      valor: value.valor,
      valorLabel: this.formatCurrency(value.valor),
      justificacion: value.justificacion.trim(),
      fecha: todayIso(),
      registradoPor: SESSION_USER,
    };

    this._conciliaciones.update((list) =>
      list.map((c) => (c.id === id ? { ...c, estado: { label: 'Ajustada', variant: ESTADO_VARIANT.Ajustada }, ajuste } : c)),
    );

    this.auditoriaService.registrar({
      modulo: 'Conciliación',
      accion: 'Registrar Ajuste',
      entidadAfectada: `Conciliación ${id}`,
      detalle: `${ajuste.tipo} por ${ajuste.valorLabel}. Justificación: ${ajuste.justificacion}`,
    });
  }

  private nextId(): string {
    this.correlativo += 1;
    return `CON-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    const signo = value < 0 ? '-' : '';
    return `${signo}$${Math.abs(value).toLocaleString('en-US')}`;
  }
}
