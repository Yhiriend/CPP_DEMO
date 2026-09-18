import { Injectable, inject } from '@angular/core';

import { todayIso } from '../../shared/utils/date';
import { CuentaCobro } from '../cuentas-de-cobro/models/cuenta-cobro.model';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { ImputacionesService } from '../imputaciones/imputaciones.service';
import { PagosService } from '../pagos/pagos.service';
import { Alerta, SeveridadAlerta } from './models/alerta.model';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const DIAS_VENCIMIENTO_PROXIMO = 30;
const UMBRAL_PAGO_SIN_IDENTIFICAR = { alta: 30, media: 15 };
const UMBRAL_DESEMBOLSO_PENDIENTE = { alta: 30, media: 15 };
const UMBRAL_SALDO_A_FAVOR = { alta: 60, media: 30 };

/**
 * HU derivada del flujo financiero ampliado ("Controlar recepción y cartera... alertas")
 * — vista de solo lectura, sin estado propio: consolida lo que Cuentas de Cobro, Pagos,
 * Imputaciones y Acuerdos FONPET ya calculan en vivo, igual que Cartera y Reportes.
 */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly pagosService = inject(PagosService);

  getAlertas(): readonly Alerta[] {
    return [
      ...this.alertasVencimiento(),
      ...this.alertasPagosSinIdentificar(),
      ...this.alertasDesembolsosPendientes(),
      ...this.alertasSaldosAFavor(),
    ].sort((a, b) => this.rango(a.severidad) - this.rango(b.severidad) || b.diasTranscurridos - a.diasTranscurridos);
  }

  private estaResuelta(cuenta: CuentaCobro): boolean {
    return cuenta.estado.label === 'Anulada' || this.imputacionesService.estaCubierta(cuenta);
  }

  /** Vencimiento próximo (aún no vencida) y cuenta ya vencida — ambas leen fechaVencimiento (CCAL-005). */
  private alertasVencimiento(): Alerta[] {
    const hoy = todayIso();
    const alertas: Alerta[] = [];

    for (const cuenta of this.cuentasDeCobroService.cuentasCobro()) {
      if (this.estaResuelta(cuenta) || !cuenta.fechaVencimiento) continue;

      const diasRestantes = this.diasEntre(hoy, cuenta.fechaVencimiento);
      const estadoVisual = this.cuentasDeCobroService.estadoVisual(cuenta).label;

      if (estadoVisual === 'Vencida') {
        const diasMora = this.diasEntre(cuenta.fechaVencimiento, hoy);
        alertas.push({
          id: `venc-${cuenta.idCuenta}`,
          categoria: 'Cuenta Vencida',
          severidad: this.severidadPorDias(diasMora, { alta: 60, media: 30 }),
          entidadId: cuenta.entidadId,
          entidad: cuenta.entidad,
          detalle: `Cuenta ${cuenta.idCuenta} vencida hace ${diasMora} días (venció el ${cuenta.fechaVencimiento}).`,
          fechaReferencia: cuenta.fechaVencimiento,
          diasTranscurridos: diasMora,
          ruta: ['/cuentas-de-cobro'],
        });
      } else if (diasRestantes >= 0 && diasRestantes <= DIAS_VENCIMIENTO_PROXIMO) {
        alertas.push({
          id: `prox-${cuenta.idCuenta}`,
          categoria: 'Vencimiento Próximo',
          severidad: diasRestantes <= 5 ? 'Crítica' : diasRestantes <= 10 ? 'Alta' : 'Media',
          entidadId: cuenta.entidadId,
          entidad: cuenta.entidad,
          detalle: `Cuenta ${cuenta.idCuenta} vence en ${diasRestantes} días (${cuenta.fechaVencimiento}).`,
          fechaReferencia: cuenta.fechaVencimiento,
          diasTranscurridos: diasRestantes,
          ruta: ['/cuentas-de-cobro'],
        });
      }
    }

    return alertas;
  }

  /** Pagos sin identificar (CCAL-023) que llevan demasiado tiempo sin resolverse. */
  private alertasPagosSinIdentificar(): Alerta[] {
    const hoy = todayIso();
    return this.pagosService
      .pagos()
      .filter((pago) => !pago.cuentaCobroId)
      .map((pago) => {
        const dias = this.diasEntre(pago.fecha, hoy);
        return {
          id: `pago-${pago.idTransaccion}`,
          categoria: 'Pago Sin Identificar' as const,
          severidad: this.severidadPorDias(dias, UMBRAL_PAGO_SIN_IDENTIFICAR),
          entidadId: pago.entidadId,
          entidad: pago.entidad,
          detalle: `Pago ${pago.idTransaccion} por ${pago.montoRecibidoLabel} sin identificar hace ${dias} días.`,
          fechaReferencia: pago.fecha,
          diasTranscurridos: dias,
          ruta: ['/pagos'],
        };
      });
  }

  /** Desembolsos FONPET con saldo disponible que aún no se han imputado. */
  private alertasDesembolsosPendientes(): Alerta[] {
    const hoy = todayIso();
    return this.imputacionesService.desembolsosPendientesDeImputar().map((desembolso) => {
      const dias = this.diasEntre(desembolso.fecha, hoy);
      return {
        id: `des-${desembolso.idDesembolso}`,
        categoria: 'Desembolso FONPET Pendiente' as const,
        severidad: this.severidadPorDias(dias, UMBRAL_DESEMBOLSO_PENDIENTE),
        entidadId: desembolso.entidadId,
        entidad: desembolso.entidad,
        detalle: `Desembolso ${desembolso.idDesembolso} por ${desembolso.valorLabel} sin imputar hace ${dias} días.`,
        fechaReferencia: desembolso.fecha,
        diasTranscurridos: dias,
        ruta: ['/imputaciones'],
      };
    });
  }

  /** Saldos a favor (gestión de excepciones de recaudo — CCAL-022) que llevan tiempo sin aplicarse. */
  private alertasSaldosAFavor(): Alerta[] {
    const hoy = todayIso();
    return this.imputacionesService.saldosAFavorPendientes().map((saldo) => {
      const dias = this.diasEntre(saldo.fecha, hoy);
      return {
        id: `saf-${saldo.id}`,
        categoria: 'Saldo a Favor Sin Aplicar' as const,
        severidad: this.severidadPorDias(dias, UMBRAL_SALDO_A_FAVOR),
        entidadId: saldo.entidadId,
        entidad: saldo.entidad,
        detalle: `Saldo a favor ${saldo.id} por ${saldo.valorLabel} sin aplicar hace ${dias} días.`,
        fechaReferencia: saldo.fecha,
        diasTranscurridos: dias,
        ruta: ['/imputaciones'],
      };
    });
  }

  private severidadPorDias(dias: number, umbral: { alta: number; media: number }): SeveridadAlerta {
    if (dias >= umbral.alta) return 'Alta';
    if (dias >= umbral.media) return 'Media';
    return 'Baja';
  }

  private rango(severidad: SeveridadAlerta): number {
    return { Crítica: 0, Alta: 1, Media: 2, Baja: 3 }[severidad];
  }

  private diasEntre(desde: string, hasta: string): number {
    return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / MS_PER_DAY);
  }
}
