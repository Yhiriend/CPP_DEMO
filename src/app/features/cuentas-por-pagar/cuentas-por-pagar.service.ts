import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { todayIso } from '../../shared/utils/date';
import { calcularPorcentajeConcurrencia, calcularValorCuotaParte } from '../../shared/utils/liquidacion';
import OBLIGACIONES_SEED from '../../fake_data/obligaciones-por-pagar.json';
import { EntidadesService } from '../entidades/entidades.service';
import {
  EstadoObligacionPorPagar,
  FLUJO_OBLIGACION_POR_PAGAR,
  ObligacionPorPagar,
  RegistrarObligacionPorPagarValue,
} from './models/obligacion-por-pagar.model';

const ESTADO_VARIANT: Record<EstadoObligacionPorPagar, TableBadgeVariant> = {
  Registrada: 'neutral',
  Validada: 'info',
  'Aprobada Financiera': 'warning',
  Causada: 'info',
  Pagada: 'success',
  Rechazada: 'danger',
};

/** Área responsable del paso al que se avanza — matiza el carril del diagrama. */
const AREA_DEL_ESTADO: Record<EstadoObligacionPorPagar, string> = {
  Registrada: 'Gestión Pensional',
  Validada: 'Gestión Pensional',
  'Aprobada Financiera': 'Subdirección Financiera',
  Causada: 'Contabilidad',
  Pagada: 'Tesorería',
  Rechazada: 'Gestión Pensional',
};

const SESSION_USER = 'admin@sgdp.gov.co';

/**
 * HU derivada del flujo financiero ampliado — el camino "por pagar": SCPP le debe una
 * cuota parte a una entidad acreedora. Es una cadena de aprobación secuencial entre 4
 * áreas (no se puede saltar un paso), a diferencia del resto de módulos que son de
 * captura libre.
 */
@Injectable({ providedIn: 'root' })
export class CuentasPorPagarService {
  private readonly entidadesService = inject(EntidadesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _obligaciones = persistedSignal<ObligacionPorPagar[]>('obligaciones-por-pagar', OBLIGACIONES_SEED as ObligacionPorPagar[]);
  readonly obligaciones = this._obligaciones.asReadonly();

  private correlativo = this._obligaciones().length;

  getById(id: string): ObligacionPorPagar | undefined {
    return this._obligaciones().find((o) => o.id === id);
  }

  /** El siguiente estado del camino feliz, o null si ya está en el último paso o fue rechazada. */
  siguienteEstado(obligacion: ObligacionPorPagar): EstadoObligacionPorPagar | null {
    const indice = FLUJO_OBLIGACION_POR_PAGAR.indexOf(obligacion.estado.label as EstadoObligacionPorPagar);
    if (indice === -1 || indice === FLUJO_OBLIGACION_POR_PAGAR.length - 1) return null;
    return FLUJO_OBLIGACION_POR_PAGAR[indice + 1];
  }

  puedeRechazar(obligacion: ObligacionPorPagar): boolean {
    return obligacion.estado.label !== 'Pagada' && obligacion.estado.label !== 'Rechazada';
  }

  /** HU — "Registrar obligación por pagar" + "Validar obligación y soportes" de entrada (CCAL-001/002). */
  registrar(value: RegistrarObligacionPorPagarValue): ObligacionPorPagar {
    const entidad = this.entidadesService.getEntidadById(value.entidadAcreedoraId);
    if (!entidad) {
      throw new Error(`No existe la entidad ${value.entidadAcreedoraId}.`);
    }
    if (!value.pensionado.trim() || !value.numeroDocumentoPensionado.trim()) {
      throw new Error('Registre el pensionado y su documento.');
    }

    const porcentajeConcurrencia = calcularPorcentajeConcurrencia(value.diasEntidad, value.totalDiasPension);
    const valor = calcularValorCuotaParte(value.valorMesadaPensional, porcentajeConcurrencia);
    const ahora = todayIso();

    const nueva: ObligacionPorPagar = {
      id: this.nextId(),
      entidadAcreedoraId: entidad.id,
      entidadAcreedora: entidad.nombre,
      pensionado: value.pensionado.trim(),
      numeroDocumentoPensionado: value.numeroDocumentoPensionado.trim(),
      periodo: value.periodo,
      porcentajeConcurrencia,
      valorMesadaPensional: value.valorMesadaPensional,
      valor,
      valorLabel: this.formatCurrency(valor),
      soporte: value.soporte,
      estado: { label: 'Registrada', variant: ESTADO_VARIANT.Registrada },
      historialEstados: [
        { estado: 'Registrada', area: AREA_DEL_ESTADO.Registrada, fecha: ahora, usuario: SESSION_USER, observacion: null },
      ],
      fechaRegistro: ahora,
      fechaPago: null,
      registradoPor: SESSION_USER,
    };

    this._obligaciones.update((list) => [nueva, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Cuentas por Pagar',
      accion: 'Registrar',
      entidadAfectada: `Obligación ${nueva.id} (${nueva.entidadAcreedora})`,
      detalle: `Registro de obligación por pagar de ${nueva.valorLabel} — pensionado ${nueva.pensionado}.`,
    });
    return nueva;
  }

  /** Avanza al siguiente paso del flujo — no se puede saltar ni repetir un paso ya superado. */
  avanzar(id: string, observacion: string | null): void {
    const obligacion = this.getById(id);
    if (!obligacion) {
      throw new Error(`No existe la obligación ${id}.`);
    }
    const siguiente = this.siguienteEstado(obligacion);
    if (!siguiente) {
      throw new Error('Esta obligación ya completó el flujo de pago o fue rechazada.');
    }

    const ahora = todayIso();
    const registro = {
      estado: siguiente,
      area: AREA_DEL_ESTADO[siguiente],
      fecha: ahora,
      usuario: SESSION_USER,
      observacion: observacion?.trim() || null,
    };

    this._obligaciones.update((list) =>
      list.map((o) =>
        o.id === id
          ? {
              ...o,
              estado: { label: siguiente, variant: ESTADO_VARIANT[siguiente] },
              historialEstados: [registro, ...o.historialEstados],
              fechaPago: siguiente === 'Pagada' ? ahora : o.fechaPago,
            }
          : o,
      ),
    );

    this.auditoriaService.registrar({
      modulo: 'Cuentas por Pagar',
      accion: 'Avanzar Estado',
      entidadAfectada: `Obligación ${id}`,
      detalle: `${AREA_DEL_ESTADO[siguiente]} avanzó la obligación a "${siguiente}".${observacion ? ` ${observacion.trim()}` : ''}`,
    });
  }

  /** Rechaza la obligación — estado terminal alterno, requiere motivo. */
  rechazar(id: string, motivo: string): void {
    const obligacion = this.getById(id);
    if (!obligacion) {
      throw new Error(`No existe la obligación ${id}.`);
    }
    if (!this.puedeRechazar(obligacion)) {
      throw new Error('Esta obligación ya fue pagada o rechazada.');
    }
    if (!motivo.trim()) {
      throw new Error('Registre el motivo del rechazo.');
    }

    const ahora = todayIso();
    this._obligaciones.update((list) =>
      list.map((o) =>
        o.id === id
          ? {
              ...o,
              estado: { label: 'Rechazada', variant: ESTADO_VARIANT.Rechazada },
              historialEstados: [
                { estado: 'Rechazada', area: AREA_DEL_ESTADO.Rechazada, fecha: ahora, usuario: SESSION_USER, observacion: motivo.trim() },
                ...o.historialEstados,
              ],
            }
          : o,
      ),
    );

    this.auditoriaService.registrar({
      modulo: 'Cuentas por Pagar',
      accion: 'Rechazar',
      entidadAfectada: `Obligación ${id}`,
      detalle: `Rechazo de la obligación. Motivo: ${motivo.trim()}`,
    });
  }

  private nextId(): string {
    this.correlativo += 1;
    return `OPP-${new Date().getFullYear()}-${String(this.correlativo).padStart(3, '0')}`;
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
