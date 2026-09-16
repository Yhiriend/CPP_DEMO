import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { EntidadesService } from '../entidades/entidades.service';
import { PagoRecibido } from '../pagos/models/pago.model';
import { IMPUTACION_TABS, ImputacionTabId } from './imputaciones-tabs';
import { ImputacionesService } from './imputaciones.service';
import { Imputacion } from './models/imputacion.model';

interface PagoPendienteRow extends PagoRecibido {
  readonly montoDisponible: number;
  readonly montoDisponibleLabel: string;
  readonly obligacionLabel: string;
}

@Component({
  selector: 'app-imputaciones',
  imports: [Breadcrumb, StatCard, Table, FormsModule, Modal, DecimalPipe, LucideDownload],
  templateUrl: './imputaciones.html',
})
export class Imputaciones {
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly tabs = IMPUTACION_TABS;
  protected readonly activeTabId = signal<ImputacionTabId>('pendientes');
  protected readonly entidades = this.entidadesService.entidades;

  protected selectTab(tabId: ImputacionTabId): void {
    this.activeTabId.set(tabId);
  }

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const pendientes = this.imputacionesService.pagosPendientesDeImputar();
    const totalPendiente = pendientes.reduce(
      (sum, p) => sum + this.imputacionesService.montoDisponibleDePago(p),
      0,
    );
    const historico = this.imputacionesService.imputaciones();
    const totalImputado = historico.reduce((sum, i) => sum + i.valorImputado, 0);
    const totalIntereses = historico.reduce((sum, i) => sum + i.valorAplicadoIntereses, 0);
    const totalCapital = historico.reduce((sum, i) => sum + i.valorAplicadoCapital, 0);

    return [
      {
        label: 'Pagos Pendientes de Imputar',
        value: this.formatCurrency(totalPendiente),
        subtitle: `${pendientes.length} pagos`,
      },
      { label: 'Total Imputado', value: this.formatCurrency(totalImputado), subtitle: `${historico.length} imputaciones` },
      { label: 'Aplicado a Intereses', value: this.formatCurrency(totalIntereses), subtitle: 'CCAL-014' },
      { label: 'Aplicado a Capital', value: this.formatCurrency(totalCapital), subtitle: 'CCAL-015' },
    ];
  });

  // --- Pagos Pendientes de Imputar ---

  protected readonly columnsPendientes: TableColumn<PagoPendienteRow>[] = [
    { key: 'idTransaccion', header: 'ID Transacción' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'obligacionLabel', header: 'Obligación' },
    { key: 'montoRecibidoLabel', header: 'Monto Recibido', align: 'right' },
    { key: 'montoDisponibleLabel', header: 'Disponible', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
  ];

  protected readonly pagosPendientes = computed<readonly PagoPendienteRow[]>(() =>
    this.imputacionesService.pagosPendientesDeImputar().map((pago) => ({
      ...pago,
      montoDisponible: this.imputacionesService.montoDisponibleDePago(pago),
      montoDisponibleLabel: this.formatCurrency(this.imputacionesService.montoDisponibleDePago(pago)),
      obligacionLabel: pago.cuentaCobroId ?? '— Sin identificar —',
    })),
  );

  // --- Imputar modal (HU-016/017) ---

  protected readonly showImputarModal = signal(false);
  protected readonly imputarPago = signal<PagoPendienteRow | null>(null);
  protected formCuentaCobroId = '';
  protected formValorAImputar: number | null = null;
  protected formError = '';

  protected readonly cuentaBloqueada = computed(() => !!this.imputarPago()?.cuentaCobroId);

  protected readonly cuentasDisponibles = computed(() => {
    const pago = this.imputarPago();
    if (!pago) return [];
    return this.imputacionesService.cuentasPendientesDeEntidad(pago.entidadId);
  });

  protected abrirImputar(pago: PagoPendienteRow): void {
    this.imputarPago.set(pago);
    this.formCuentaCobroId = pago.cuentaCobroId ?? '';
    this.formValorAImputar = pago.montoDisponible;
    this.formError = '';
    this.showImputarModal.set(true);
  }

  protected usarObligacionMasAntigua(): void {
    const pago = this.imputarPago();
    if (!pago) return;
    const masAntigua = this.imputacionesService.obligacionMasAntigua(pago.entidadId);
    if (!masAntigua) {
      this.formError = 'No hay obligaciones pendientes para esta entidad.';
      return;
    }
    this.formCuentaCobroId = masAntigua.idCuenta;
    this.formError = '';
  }

  /** Getter (no `computed`) porque formCuentaCobroId/formValorAImputar son campos planos de ngModel, no signals. */
  protected get previsualizacion() {
    if (!this.formCuentaCobroId || !this.formValorAImputar) return null;
    return this.imputacionesService.previsualizar(this.formCuentaCobroId, this.formValorAImputar);
  }

  protected submitImputar(): void {
    const pago = this.imputarPago();
    if (!pago) return;
    if (!this.formCuentaCobroId) {
      this.formError = 'Seleccione la obligación a la que se aplicará el pago, o use la obligación más antigua.';
      return;
    }
    if (!this.formValorAImputar || this.formValorAImputar <= 0) {
      this.formError = 'Ingrese un valor a imputar mayor a cero.';
      return;
    }

    try {
      const nueva = this.imputacionesService.imputar({
        pagoId: pago.idTransaccion,
        cuentaCobroId: this.formCuentaCobroId,
        valorAImputar: this.formValorAImputar,
      });
      this.toastService.show(`Imputación ${nueva.idImputacion} registrada correctamente.`);
      this.showImputarModal.set(false);
    } catch (error) {
      this.formError = error instanceof Error ? error.message : 'No fue posible registrar la imputación.';
    }
  }

  // --- Histórico de Imputaciones (HU-018) ---

  protected readonly columnsHistorico: TableColumn<Imputacion>[] = [
    { key: 'idImputacion', header: 'ID Imputación' },
    { key: 'pagoId', header: 'Pago' },
    { key: 'cuentaCobroId', header: 'Cuenta de Cobro' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'valorImputadoLabel', header: 'Valor Imputado', align: 'right' },
    { key: 'valorAplicadoInteresesLabel', header: 'A Intereses', align: 'right' },
    { key: 'valorAplicadoCapitalLabel', header: 'A Capital', align: 'right' },
    { key: 'saldoTotalObligacionLabel', header: 'Saldo Resultante', align: 'right' },
    { key: 'reglaAplicada', header: 'Regla' },
    { key: 'fecha', header: 'Fecha' },
  ];

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterDesde = '';
  protected filterHasta = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedDesde = signal('');
  private readonly appliedHasta = signal('');

  protected readonly filteredHistorico = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const desde = this.appliedDesde();
    const hasta = this.appliedHasta();

    return this.imputacionesService.imputaciones().filter((imputacion) => {
      if (entidadId && imputacion.entidadId !== entidadId) return false;
      if (desde && imputacion.fecha < desde) return false;
      if (hasta && imputacion.fecha > hasta) return false;
      if (term) {
        const haystack =
          `${imputacion.idImputacion} ${imputacion.pagoId} ${imputacion.cuentaCobroId} ${imputacion.entidad} ${imputacion.pensionados.join(' ')}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  protected buscarHistorico(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedDesde.set(this.filterDesde);
    this.appliedHasta.set(this.filterHasta);
  }

  protected exportarHistorico(): void {
    const imputaciones = this.filteredHistorico();
    const encabezado = [
      'ID Imputación',
      'Pago',
      'Cuenta',
      'Entidad',
      'Pensionados',
      'Valor Imputado',
      'A Intereses',
      'A Capital',
      'Saldo Resultante',
      'Regla',
      'Fecha',
      'Registrado Por',
    ];
    const filas = imputaciones.map((i) => [
      i.idImputacion,
      i.pagoId,
      i.cuentaCobroId,
      i.entidad,
      i.pensionados.join('; '),
      String(i.valorImputado),
      String(i.valorAplicadoIntereses),
      String(i.valorAplicadoCapital),
      String(i.saldoTotalObligacion),
      i.reglaAplicada,
      i.fecha,
      i.registradoPor,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `imputaciones-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${imputaciones.length} imputaciones exportadas.`);
  }

  // --- Ver Detalle histórico ---

  protected readonly showDetalleModal = signal(false);
  protected readonly detalleImputacion = signal<Imputacion | null>(null);

  protected verDetalle(imputacion: Imputacion): void {
    this.detalleImputacion.set(imputacion);
    this.showDetalleModal.set(true);
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
