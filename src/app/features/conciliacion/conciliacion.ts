import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { MoneyInputDirective } from '../../shared/ui/money-input/money-input.directive';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { EntidadesService } from '../entidades/entidades.service';
import { ConciliacionService } from './conciliacion.service';
import {
  Conciliacion,
  FUENTES_CONCILIACION,
  FuenteConciliacion,
  SoporteConciliacion,
  TIPOS_AJUSTE,
  TipoAjuste,
} from './models/conciliacion.model';

@Component({
  selector: 'app-conciliacion',
  imports: [Breadcrumb, StatCard, Table, FormsModule, Modal, MoneyInputDirective, LucideDownload, LucidePlus],
  templateUrl: './conciliacion.html',
})
export class ConciliacionPage {
  private readonly conciliacionService = inject(ConciliacionService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly entidades = this.entidadesService.entidades;
  protected readonly fuentes = FUENTES_CONCILIACION;

  protected readonly columns: TableColumn<Conciliacion>[] = [
    { key: 'id', header: 'ID' },
    { key: 'fuente', header: 'Fuente' },
    { key: 'periodo', header: 'Período' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'valorReportadoLabel', header: 'Reportado', align: 'right' },
    { key: 'valorInternoLabel', header: 'Interno (SCPP)', align: 'right' },
    { key: 'diferenciaLabel', header: 'Diferencia', align: 'right' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const conciliaciones = this.conciliacionService.conciliaciones();
    const conDiferencia = conciliaciones.filter((c) => c.estado.label === 'Con Diferencia');
    const conciliadas = conciliaciones.filter((c) => c.estado.label === 'Conciliado').length;
    const ajustadas = conciliaciones.filter((c) => c.estado.label === 'Ajustada').length;
    const totalDiferencias = conDiferencia.reduce((sum, c) => sum + Math.abs(c.diferencia), 0);

    return [
      { label: 'Total Conciliaciones', value: `${conciliaciones.length}`, subtitle: `${this.fuentes.length} fuentes` },
      { label: 'Conciliadas', value: `${conciliadas}`, subtitle: 'Sin diferencia' },
      { label: 'Con Diferencia Pendiente', value: `${conDiferencia.length}`, subtitle: this.formatCurrency(totalDiferencias) },
      { label: 'Ajustadas', value: `${ajustadas}`, subtitle: 'Con nota débito/crédito' },
    ];
  });

  protected filterFuente = '';
  protected filterEstado = '';
  protected filterEntidadId = '';

  private readonly appliedFuente = signal('');
  private readonly appliedEstado = signal('');
  private readonly appliedEntidadId = signal('');

  protected readonly filteredConciliaciones = computed(() => {
    const fuente = this.appliedFuente();
    const estado = this.appliedEstado();
    const entidadId = this.appliedEntidadId();

    return this.conciliacionService.conciliaciones().filter((c) => {
      if (fuente && c.fuente !== fuente) return false;
      if (estado && c.estado.label !== estado) return false;
      if (entidadId && c.entidadId !== entidadId) return false;
      return true;
    });
  });

  protected buscar(): void {
    this.appliedFuente.set(this.filterFuente);
    this.appliedEstado.set(this.filterEstado);
    this.appliedEntidadId.set(this.filterEntidadId);
  }

  protected exportar(): void {
    const conciliaciones = this.filteredConciliaciones();
    const encabezado = ['ID', 'Fuente', 'Período', 'Entidad', 'Reportado', 'Interno', 'Diferencia', 'Estado'];
    const filas = conciliaciones.map((c) => [
      c.id,
      c.fuente,
      c.periodo,
      c.entidad,
      String(c.valorReportado),
      String(c.valorInterno),
      String(c.diferencia),
      c.estado.label,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conciliacion-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${conciliaciones.length} conciliaciones exportadas.`);
  }

  // --- Registrar Conciliación ---

  protected readonly showFormModal = signal(false);
  protected formFuente: FuenteConciliacion = 'SIIF';
  protected formPeriodo = '';
  protected formEntidadId = '';
  protected formValorReportado: number | null = null;
  protected formSoporteNombre = '';
  protected formError = '';

  protected openFormModal(): void {
    this.formFuente = 'SIIF';
    this.formPeriodo = '';
    this.formEntidadId = '';
    this.formValorReportado = null;
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

  protected get previewValorInterno(): number | null {
    if (!this.formPeriodo) return null;
    return this.conciliacionService.calcularValorInterno(this.formFuente, this.formPeriodo, this.formEntidadId || null);
  }

  protected get previewValorInternoLabel(): string {
    const valor = this.previewValorInterno;
    return valor === null ? '—' : this.formatCurrency(valor);
  }

  protected get previewDiferenciaLabel(): string {
    const interno = this.previewValorInterno;
    if (interno === null || this.formValorReportado === null) return '—';
    return this.formatCurrency(this.formValorReportado - interno);
  }

  protected submitForm(): void {
    if (!this.formPeriodo || this.formValorReportado === null || this.formValorReportado < 0) {
      this.formError = 'Complete el período y el valor reportado.';
      return;
    }

    const soporte: SoporteConciliacion | null = this.formSoporteNombre
      ? { nombreArchivo: this.formSoporteNombre, fechaCargue: todayIso() }
      : null;

    try {
      const nueva = this.conciliacionService.registrar({
        fuente: this.formFuente,
        periodo: this.formPeriodo,
        entidadId: this.formEntidadId || null,
        valorReportado: this.formValorReportado,
        soporte,
      });
      this.toastService.show(`Conciliación ${nueva.id} registrada correctamente.`);
      this.showFormModal.set(false);
    } catch (error) {
      this.formError = error instanceof Error ? error.message : 'No fue posible registrar la conciliación.';
    }
  }

  // --- Ver detalle ---

  protected readonly showDetalleModal = signal(false);
  protected readonly detalleConciliacion = signal<Conciliacion | null>(null);

  protected verDetalle(conciliacion: Conciliacion): void {
    this.detalleConciliacion.set(conciliacion);
    this.showDetalleModal.set(true);
  }

  private refrescarDetalle(id: string): void {
    const actualizada = this.conciliacionService.getById(id);
    if (actualizada) this.detalleConciliacion.set(actualizada);
  }

  // --- Registrar Ajuste ---

  protected readonly showAjusteModal = signal(false);
  protected readonly tiposAjuste = TIPOS_AJUSTE;
  protected ajusteTipo: TipoAjuste = 'Nota Débito';
  protected ajusteValor: number | null = null;
  protected ajusteJustificacion = '';
  protected ajusteError = '';

  protected openAjusteModal(): void {
    const conciliacion = this.detalleConciliacion();
    if (!conciliacion) return;
    this.ajusteTipo = conciliacion.diferencia < 0 ? 'Nota Débito' : 'Nota Crédito';
    this.ajusteValor = Math.abs(conciliacion.diferencia);
    this.ajusteJustificacion = '';
    this.ajusteError = '';
    this.showAjusteModal.set(true);
  }

  protected submitAjuste(): void {
    const conciliacion = this.detalleConciliacion();
    if (!conciliacion || this.ajusteValor === null) return;
    try {
      this.conciliacionService.registrarAjuste(conciliacion.id, {
        tipo: this.ajusteTipo,
        valor: this.ajusteValor,
        justificacion: this.ajusteJustificacion,
      });
      this.toastService.show(`Ajuste registrado sobre ${conciliacion.id}.`);
      this.showAjusteModal.set(false);
      this.refrescarDetalle(conciliacion.id);
    } catch (error) {
      this.ajusteError = error instanceof Error ? error.message : 'No fue posible registrar el ajuste.';
    }
  }

  private formatCurrency(value: number): string {
    const signo = value < 0 ? '-' : '';
    return `${signo}$${Math.abs(value).toLocaleString('en-US')}`;
  }
}
