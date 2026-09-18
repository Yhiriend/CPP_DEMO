import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { MoneyInputDirective } from '../../shared/ui/money-input/money-input.directive';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableBadge, TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { EntidadesService } from '../entidades/entidades.service';
import { ImputacionesService } from '../imputaciones/imputaciones.service';
import { FUENTES_PAGO, FuenteOrigenPago, PagoFormValue, PagoRecibido, SoportePago, TIPOS_PAGO, TipoPago } from './models/pago.model';
import { PAGOS_TABS, PagoTabId } from './pagos-tabs';
import { PagosService } from './pagos.service';

interface PagoRow extends PagoRecibido {
  readonly estadoDerivado: TableBadge;
  readonly montoDisponible: number;
  readonly montoDisponibleLabel: string;
}

@Component({
  selector: 'app-pagos',
  imports: [Breadcrumb, StatCard, Table, FormsModule, Modal, MoneyInputDirective, LucideDownload, LucidePlus],
  templateUrl: './pagos.html',
})
export class Pagos {
  private readonly pagosService = inject(PagosService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tabs = PAGOS_TABS;
  protected readonly activeTabId = signal<PagoTabId>('pendientes');
  protected readonly entidades = this.entidadesService.entidades;

  protected readonly columns: TableColumn<PagoRow>[] = [
    { key: 'idTransaccion', header: 'ID Transacción' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'origen', header: 'Fuente' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'montoRecibidoLabel', header: 'Monto Recibido', align: 'right' },
    { key: 'montoDisponibleLabel', header: 'Disponible', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'estadoDerivado', header: 'Estado' },
  ];

  private readonly rows = computed<readonly PagoRow[]>(() =>
    this.pagosService.pagos().map((pago) => this.toRow(pago)),
  );

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterOrigen = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedOrigen = signal('');

  protected readonly filteredPorTab = computed(() => {
    const tabId = this.activeTabId();
    return this.rows().filter((pago) => {
      switch (tabId) {
        case 'pendientes':
          return pago.estadoDerivado.label !== 'Aplicado';
        case 'aplicados':
          return pago.estadoDerivado.label === 'Aplicado';
        case 'fonpet':
          return pago.origen.label === 'FONPET';
        case 'recursos-propios':
          return pago.origen.label === 'Recursos Propios';
        case 'todos':
          return true;
      }
    });
  });

  protected readonly filteredPagos = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const origen = this.appliedOrigen();

    return this.filteredPorTab().filter((pago) => {
      if (entidadId && pago.entidadId !== entidadId) return false;
      if (origen && pago.origen.label !== origen) return false;
      if (term) {
        const haystack = `${pago.idTransaccion} ${pago.entidad}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  protected buscar(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedOrigen.set(this.filterOrigen);
  }

  protected selectTab(tabId: PagoTabId): void {
    this.activeTabId.set(tabId);
  }

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const pagos = this.rows();
    const sinIdentificar = pagos.filter((p) => p.estadoDerivado.label === 'Sin Identificar');
    const pendientes = pagos.filter((p) => p.estadoDerivado.label !== 'Aplicado');
    const aplicados = pagos.filter((p) => p.estadoDerivado.label === 'Aplicado');

    return [
      { label: 'Total Recibido', value: this.formatTotal(pagos), subtitle: `${pagos.length} transacciones` },
      {
        label: 'Pendiente de Aplicar',
        value: this.formatTotal(pendientes),
        subtitle: `${pendientes.length} transacciones`,
      },
      { label: 'Total Aplicado', value: this.formatTotal(aplicados), subtitle: `${aplicados.length} transacciones` },
      {
        label: 'Sin Identificar',
        value: this.formatTotal(sinIdentificar),
        subtitle: `${sinIdentificar.length} ${sinIdentificar.length === 1 ? 'transacción' : 'transacciones'}`,
      },
    ];
  });

  protected readonly totalRecibidoLabel = computed(() => this.formatTotal(this.filteredPagos()));

  protected readonly resumenEstados = computed(() => {
    const pagos = this.filteredPagos();
    const conteo = (label: string) => pagos.filter((p) => p.estadoDerivado.label === label).length;
    return `${conteo('Sin Identificar')} sin identificar · ${conteo('Pendiente de Aplicar')} pend. aplicar · ${conteo('Parcialmente Aplicado')} parcial · ${conteo('Aplicado')} aplicado`;
  });

  // --- Exportar ---

  protected exportar(): void {
    const pagos = this.filteredPagos();
    const encabezado = ['ID Transacción', 'Entidad', 'Fuente', 'Tipo', 'Monto Recibido', 'Disponible', 'Fecha', 'Estado'];
    const filas = pagos.map((p) => [
      p.idTransaccion,
      p.entidad,
      p.origen.label,
      p.tipo,
      String(p.montoRecibido),
      String(p.montoDisponible),
      p.fecha,
      p.estadoDerivado.label,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagos-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${pagos.length} pagos exportados.`);
  }

  // --- Registrar Pago (HU-012/013/014) ---

  protected readonly showFormModal = signal(false);
  protected readonly fuentesPago = FUENTES_PAGO;
  protected readonly tiposPago = TIPOS_PAGO;

  protected formEntidadId = '';
  protected formCuentaCobroId = '';
  protected formOrigen: FuenteOrigenPago = 'Recursos Propios';
  protected formTipo: TipoPago = 'Total';
  protected formMonto: number | null = null;
  protected formFecha = todayIso();
  protected formSoporteNombre = '';
  protected formError = '';

  /** Getter (no `computed`) porque formEntidadId es un campo plano de ngModel, no un signal. */
  protected get cuentasDeLaEntidad() {
    return this.cuentasDeCobroService
      .cuentasCobro()
      .filter((c) => c.entidadId === this.formEntidadId && c.estado.label !== 'Anulada');
  }

  protected openFormModal(): void {
    this.formEntidadId = '';
    this.formCuentaCobroId = '';
    this.formOrigen = 'Recursos Propios';
    this.formTipo = 'Total';
    this.formMonto = null;
    this.formFecha = todayIso();
    this.formSoporteNombre = '';
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected onSoporteSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      this.formError = 'Solo se permiten archivos XLSX como soporte documental.';
      input.value = '';
      return;
    }
    this.formSoporteNombre = archivo.name;
    this.formError = '';
  }

  protected get excedenteAdvertencia(): string | null {
    if (!this.formCuentaCobroId || !this.formMonto) return null;
    const cuenta = this.cuentasDeLaEntidad.find((c) => c.idCuenta === this.formCuentaCobroId);
    if (!cuenta) return null;
    const { saldoTotal } = this.imputacionesService.saldoDeCuenta(cuenta);
    const excedente = Math.max(0, this.formMonto - saldoTotal); // CCAL-022
    if (excedente <= 0) return null;
    return `El monto supera el saldo pendiente de la obligación en ${this.formatCurrency(excedente)} (CCAL-022).`;
  }

  protected submitForm(): void {
    if (!this.formEntidadId || !this.formMonto || this.formMonto <= 0 || !this.formFecha) {
      this.formError = 'Complete todos los campos obligatorios.';
      return;
    }

    const soporte: SoportePago | null = this.formSoporteNombre
      ? { nombreArchivo: this.formSoporteNombre, fechaCargue: todayIso() }
      : null;

    const value: PagoFormValue = {
      entidadId: this.formEntidadId,
      cuentaCobroId: this.formCuentaCobroId || null,
      origen: this.formOrigen,
      tipo: this.formTipo,
      montoRecibido: this.formMonto,
      fecha: this.formFecha,
      soporte,
    };

    const nuevo = this.pagosService.registrarPago(value);
    this.toastService.show(`Pago ${nuevo.idTransaccion} registrado correctamente.`);
    this.showFormModal.set(false);
  }

  // --- Ver Detalle ---

  protected readonly showDetalleModal = signal(false);
  protected readonly detallePago = signal<PagoRow | null>(null);

  protected verDetalle(pago: PagoRow): void {
    this.detallePago.set(pago);
    this.showDetalleModal.set(true);
  }

  protected irAImputar(): void {
    this.showDetalleModal.set(false);
    this.router.navigate(['/imputaciones']);
  }

  private toRow(pago: PagoRecibido): PagoRow {
    const montoDisponible = this.imputacionesService.montoDisponibleDePago(pago);
    return {
      ...pago,
      estadoDerivado: this.imputacionesService.estadoDePago(pago),
      montoDisponible,
      montoDisponibleLabel: this.formatCurrency(montoDisponible),
    };
  }

  private formatTotal(pagos: readonly PagoRecibido[]): string {
    return this.formatCurrency(pagos.reduce((sum, pago) => sum + pago.montoRecibido, 0));
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
