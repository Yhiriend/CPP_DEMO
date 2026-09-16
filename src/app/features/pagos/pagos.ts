import { Component, computed, inject, signal } from '@angular/core';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PagoRecibido } from './models/pago.model';
import { PAGOS_TABS, PagoTabId } from './pagos-tabs';
import { PagosService } from './pagos.service';

@Component({
  selector: 'app-pagos',
  imports: [Breadcrumb, StatCard, Table, LucideDownload, LucidePlus],
  templateUrl: './pagos.html',
})
export class Pagos {
  private readonly pagosService = inject(PagosService);
  private readonly toastService = inject(ToastService);

  protected readonly kpis = this.pagosService.getKpis();
  protected readonly tabs = PAGOS_TABS;
  protected readonly activeTabId = signal<PagoTabId>('pendientes');

  protected readonly filteredPagos = computed(() => this.pagosService.getPagosPorTab(this.activeTabId()));

  protected readonly columns: TableColumn<PagoRecibido>[] = [
    { key: 'idTransaccion', header: 'ID Transacción' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'origen', header: 'Origen' },
    { key: 'montoRecibidoLabel', header: 'Monto Recibido', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly totalRecibidoLabel = computed(() => {
    const total = this.filteredPagos().reduce((sum, pago) => sum + pago.montoRecibido, 0);
    return `$${total.toLocaleString('en-US')}`;
  });

  protected readonly resumenEstados = computed(() => {
    const pagos = this.filteredPagos();
    const pendientes = pagos.filter((pago) => pago.estado.label === 'Pend. Aplicar').length;
    const aplicados = pagos.filter((pago) => pago.estado.label === 'Aplicado').length;
    const revision = pagos.filter((pago) => pago.estado.label === 'En Revisión').length;
    return `${pendientes} pend. aplicar · ${aplicados} aplicados · ${revision} revisión`;
  });

  protected selectTab(tabId: PagoTabId): void {
    this.activeTabId.set(tabId);
  }

  protected buscar(): void {
    this.toastService.show('Los filtros avanzados estarán disponibles próximamente.');
  }

  protected exportar(): void {
    this.toastService.show('La exportación a CSV estará disponible próximamente.');
  }

  protected registrarPago(): void {
    this.toastService.show('Registrar un pago estará disponible cuando el backend esté conectado.');
  }

  protected verDetalle(pago: PagoRecibido): void {
    this.toastService.show(`El detalle de ${pago.idTransaccion} estará disponible próximamente.`);
  }
}
