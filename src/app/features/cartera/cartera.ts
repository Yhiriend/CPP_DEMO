import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDownload, LucideExternalLink } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { EntidadesService } from '../entidades/entidades.service';
import { CarteraTabId, CARTERA_TABS } from './cartera-tabs';
import { CarteraService } from './cartera.service';
import {
  CarteraPorEntidad,
  CarteraPorPensionado,
  MovimientoCartera,
  ObligacionCarteraRow,
} from './models/cartera.model';

@Component({
  selector: 'app-cartera',
  imports: [Breadcrumb, StatCard, Table, FormsModule, LucideDownload, LucideExternalLink],
  templateUrl: './cartera.html',
})
export class Cartera {
  private readonly carteraService = inject(CarteraService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly kpis = computed(() => this.carteraService.getKpis());
  protected readonly tabs = CARTERA_TABS;
  protected readonly activeTabId = signal<CarteraTabId>('estado-cuenta-general');
  protected readonly entidades = this.entidadesService.entidades;

  protected selectTab(tabId: CarteraTabId): void {
    this.activeTabId.set(tabId);
  }

  // --- Estado de Cuenta General / Cartera Vencida ---

  protected readonly columnsObligaciones: TableColumn<ObligacionCarteraRow>[] = [
    { key: 'idCuenta', header: 'ID Cuenta' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'pensionadosLabel', header: 'Pensionados' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'capitalMasInteresesLabel', header: 'Capital + Intereses', align: 'right' },
    { key: 'saldoTotalLabel', header: 'Saldo Pendiente', align: 'right' },
    { key: 'estado', header: 'Estado' },
  ];

  protected filterEntidadId = '';
  private readonly appliedEntidadId = signal('');

  protected buscar(): void {
    this.appliedEntidadId.set(this.filterEntidadId);
  }

  protected readonly obligaciones = computed<readonly ObligacionCarteraRow[]>(() => {
    const entidadId = this.appliedEntidadId();
    const filas = this.carteraService.getObligaciones();
    return entidadId ? filas.filter((o) => o.entidadId === entidadId) : filas;
  });

  protected readonly carteraVencida = computed(() => this.carteraService.getCarteraVencida());

  protected verFichaEntidad(fila: { entidadId: string }): void {
    this.router.navigate(['/entidades', fila.entidadId]);
  }

  // --- Cartera por Entidad ---

  protected readonly columnsPorEntidad: TableColumn<CarteraPorEntidad>[] = [
    { key: 'entidad', header: 'Entidad' },
    { key: 'obligacionesPendientes', header: 'Oblig. Pendientes', align: 'right' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'saldoTotalLabel', header: 'Saldo Pendiente', align: 'right' },
    { key: 'cobertura', header: '% Cobertura', align: 'right' },
  ];

  protected readonly carteraPorEntidad = computed(() => this.carteraService.getCarteraPorEntidad());

  // --- Cartera por Pensionado ---

  protected readonly columnsPorPensionado: TableColumn<CarteraPorPensionado>[] = [
    { key: 'pensionado', header: 'Pensionado' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'obligacionesPendientes', header: 'Oblig. Pendientes', align: 'right' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'saldoTotalLabel', header: 'Saldo Pendiente', align: 'right' },
    { key: 'cobertura', header: '% Cobertura', align: 'right' },
  ];

  protected readonly carteraPorPensionado = computed(() => this.carteraService.getCarteraPorPensionado());

  protected verPensionado(fila: CarteraPorPensionado): void {
    this.router.navigate(['/pensionados', fila.pensionadoId]);
  }

  // --- Intereses Generados ---

  protected readonly columnsIntereses: TableColumn<ObligacionCarteraRow>[] = [
    { key: 'idCuenta', header: 'ID Cuenta' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'diasMora', header: 'Días Mora', align: 'right' },
    { key: 'tasaDtfLabel', header: 'Tasa DTF Aplicada', align: 'right' },
    { key: 'interesesLabel', header: 'Interés Calculado', align: 'right' },
  ];

  protected readonly obligacionesConIntereses = computed(() =>
    this.carteraService.getObligaciones().filter((o) => o.intereses > 0),
  );

  // --- Histórico de Movimientos ---

  protected readonly columnsMovimientos: TableColumn<MovimientoCartera>[] = [
    { key: 'idImputacion', header: 'ID Imputación' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'cuentaCobroId', header: 'Cuenta de Cobro' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'origen', header: 'Origen' },
    { key: 'valorImputadoLabel', header: 'Valor Aplicado', align: 'right' },
    { key: 'valorAplicadoInteresesLabel', header: 'A Intereses', align: 'right' },
    { key: 'valorAplicadoCapitalLabel', header: 'A Capital', align: 'right' },
    { key: 'saldoTotalObligacionLabel', header: 'Saldo Resultante', align: 'right' },
  ];

  protected readonly movimientos = computed(() => this.carteraService.getMovimientos());

  // --- Exportar (según la pestaña activa) ---

  protected exportar(): void {
    let filas: readonly Record<string, string>[] = [];

    switch (this.activeTabId()) {
      case 'estado-cuenta-general':
        filas = this.obligaciones().map((o) => ({
          'ID Cuenta': o.idCuenta,
          Entidad: o.entidad,
          Pensionados: o.pensionadosLabel,
          Capital: String(o.capital),
          Intereses: String(o.intereses),
          'Saldo Pendiente': String(o.saldoTotal),
          Estado: o.estado.label,
        }));
        break;
      case 'cartera-vencida':
        filas = this.carteraVencida().map((o) => ({
          'ID Cuenta': o.idCuenta,
          Entidad: o.entidad,
          Capital: String(o.capital),
          Intereses: String(o.intereses),
          'Saldo Pendiente': String(o.saldoTotal),
        }));
        break;
      case 'cartera-por-entidad':
        filas = this.carteraPorEntidad().map((c) => ({
          Entidad: c.entidad,
          'Oblig. Pendientes': String(c.obligacionesPendientes),
          Capital: String(c.capital),
          Intereses: String(c.intereses),
          'Saldo Pendiente': String(c.saldoTotal),
        }));
        break;
      case 'cartera-por-pensionado':
        filas = this.carteraPorPensionado().map((c) => ({
          Pensionado: c.pensionado,
          Entidad: c.entidad,
          Capital: String(c.capital),
          Intereses: String(c.intereses),
          'Saldo Pendiente': String(c.saldoTotal),
        }));
        break;
      case 'intereses-generados':
        filas = this.obligacionesConIntereses().map((o) => ({
          'ID Cuenta': o.idCuenta,
          Entidad: o.entidad,
          Capital: String(o.capital),
          'Días Mora': String(o.diasMora),
          Interés: String(o.intereses),
        }));
        break;
      case 'historico-movimientos':
        filas = this.movimientos().map((m) => ({
          'ID Imputación': m.idImputacion,
          Fecha: m.fecha,
          Cuenta: m.cuentaCobroId,
          Entidad: m.entidad,
          Origen: m.origen,
        }));
        break;
    }

    if (filas.length === 0) {
      this.toastService.show('No hay datos para exportar en esta vista.');
      return;
    }

    const encabezado = Object.keys(filas[0]);
    const csv = [encabezado, ...filas.map((fila) => encabezado.map((clave) => fila[clave]))]
      .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartera-${this.activeTabId()}-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${filas.length} filas exportadas.`);
  }
}
