import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { MoneyInputDirective } from '../../shared/ui/money-input/money-input.directive';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { calcularPorcentajeConcurrencia, calcularValorCuotaParte } from '../../shared/utils/liquidacion';
import { EntidadesService } from '../entidades/entidades.service';
import { CuentasPorPagarService } from './cuentas-por-pagar.service';
import {
  FLUJO_OBLIGACION_POR_PAGAR,
  EstadoObligacionPorPagar,
  ObligacionPorPagar,
  SoporteObligacionPorPagar,
} from './models/obligacion-por-pagar.model';

@Component({
  selector: 'app-cuentas-por-pagar',
  imports: [Breadcrumb, Table, FormsModule, Modal, MoneyInputDirective, LucideDownload, LucidePlus],
  templateUrl: './cuentas-por-pagar.html',
})
export class CuentasPorPagar {
  private readonly cuentasPorPagarService = inject(CuentasPorPagarService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly entidades = this.entidadesService.entidades;
  protected readonly flujo = FLUJO_OBLIGACION_POR_PAGAR;
  protected readonly estadosFiltro: readonly EstadoObligacionPorPagar[] = [...FLUJO_OBLIGACION_POR_PAGAR, 'Rechazada'];

  protected readonly columns: TableColumn<ObligacionPorPagar>[] = [
    { key: 'id', header: 'ID' },
    { key: 'entidadAcreedora', header: 'Entidad Acreedora' },
    { key: 'pensionado', header: 'Pensionado' },
    { key: 'periodo', header: 'Periodo' },
    { key: 'valorLabel', header: 'Valor', align: 'right' },
    { key: 'fechaRegistro', header: 'Fecha Registro' },
    { key: 'estado', header: 'Estado' },
  ];

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterEstado = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedEstado = signal('');

  protected readonly filteredObligaciones = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const estado = this.appliedEstado();

    return this.cuentasPorPagarService.obligaciones().filter((o) => {
      if (entidadId && o.entidadAcreedoraId !== entidadId) return false;
      if (estado && o.estado.label !== estado) return false;
      if (term && !`${o.id} ${o.entidadAcreedora} ${o.pensionado}`.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  protected buscar(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedEstado.set(this.filterEstado);
  }

  protected exportar(): void {
    const obligaciones = this.filteredObligaciones();
    const encabezado = ['ID', 'Entidad Acreedora', 'Pensionado', 'Documento', 'Periodo', 'Valor', 'Estado', 'Fecha Registro'];
    const filas = obligaciones.map((o) => [
      o.id,
      o.entidadAcreedora,
      o.pensionado,
      o.numeroDocumentoPensionado,
      o.periodo,
      String(o.valor),
      o.estado.label,
      o.fechaRegistro,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cuentas-por-pagar-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${obligaciones.length} obligaciones exportadas.`);
  }

  // --- Registrar Obligación por Pagar ---

  protected readonly showFormModal = signal(false);
  protected formEntidadId = '';
  protected formPensionado = '';
  protected formDocumento = '';
  protected formPeriodo = '';
  protected formValorMesadaPensional: number | null = null;
  protected formDiasEntidad: number | null = null;
  protected formTotalDiasPension: number | null = null;
  protected formSoporteNombre = '';
  protected formError = '';

  protected openFormModal(): void {
    this.formEntidadId = '';
    this.formPensionado = '';
    this.formDocumento = '';
    this.formPeriodo = '';
    this.formValorMesadaPensional = null;
    this.formDiasEntidad = null;
    this.formTotalDiasPension = null;
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

  protected get previewPorcentaje(): number {
    return calcularPorcentajeConcurrencia(this.formDiasEntidad ?? 0, this.formTotalDiasPension ?? 0);
  }

  protected get previewValorLabel(): string {
    const valor = calcularValorCuotaParte(this.formValorMesadaPensional ?? 0, this.previewPorcentaje);
    return `$${valor.toLocaleString('en-US')}`;
  }

  protected submitForm(): void {
    if (
      !this.formEntidadId ||
      !this.formPensionado.trim() ||
      !this.formDocumento.trim() ||
      !this.formPeriodo.trim() ||
      !this.formValorMesadaPensional ||
      !this.formDiasEntidad ||
      !this.formTotalDiasPension
    ) {
      this.formError = 'Complete todos los campos obligatorios.';
      return;
    }
    if (this.formDiasEntidad > this.formTotalDiasPension) {
      this.formError = 'Los días de la entidad no pueden superar el total de días de la pensión.';
      return;
    }

    const soporte: SoporteObligacionPorPagar | null = this.formSoporteNombre
      ? { nombreArchivo: this.formSoporteNombre, fechaCargue: todayIso() }
      : null;

    try {
      const nueva = this.cuentasPorPagarService.registrar({
        entidadAcreedoraId: this.formEntidadId,
        pensionado: this.formPensionado,
        numeroDocumentoPensionado: this.formDocumento,
        periodo: this.formPeriodo,
        diasEntidad: this.formDiasEntidad,
        totalDiasPension: this.formTotalDiasPension,
        valorMesadaPensional: this.formValorMesadaPensional,
        soporte,
      });
      this.toastService.show(`Obligación ${nueva.id} registrada correctamente.`);
      this.showFormModal.set(false);
    } catch (error) {
      this.formError = error instanceof Error ? error.message : 'No fue posible registrar la obligación.';
    }
  }

  // --- Ver Seguimiento ---

  protected readonly showSeguimientoModal = signal(false);
  protected readonly seguimientoObligacion = signal<ObligacionPorPagar | null>(null);

  protected verSeguimiento(obligacion: ObligacionPorPagar): void {
    this.seguimientoObligacion.set(obligacion);
    this.showSeguimientoModal.set(true);
  }

  protected siguienteEstado(obligacion: ObligacionPorPagar): EstadoObligacionPorPagar | null {
    return this.cuentasPorPagarService.siguienteEstado(obligacion);
  }

  protected puedeRechazar(obligacion: ObligacionPorPagar): boolean {
    return this.cuentasPorPagarService.puedeRechazar(obligacion);
  }

  private refrescarSeguimiento(id: string): void {
    const actualizada = this.cuentasPorPagarService.getById(id);
    if (actualizada) this.seguimientoObligacion.set(actualizada);
  }

  // --- Avanzar estado ---

  protected readonly showAvanzarModal = signal(false);
  protected avanzarObservacion = '';
  protected avanzarError = '';

  protected openAvanzarModal(): void {
    this.avanzarObservacion = '';
    this.avanzarError = '';
    this.showAvanzarModal.set(true);
  }

  protected submitAvanzar(): void {
    const obligacion = this.seguimientoObligacion();
    if (!obligacion) return;
    try {
      this.cuentasPorPagarService.avanzar(obligacion.id, this.avanzarObservacion || null);
      this.toastService.show(`Obligación ${obligacion.id} avanzó de estado.`);
      this.showAvanzarModal.set(false);
      this.refrescarSeguimiento(obligacion.id);
    } catch (error) {
      this.avanzarError = error instanceof Error ? error.message : 'No fue posible avanzar la obligación.';
    }
  }

  // --- Rechazar ---

  protected readonly showRechazarModal = signal(false);
  protected rechazarMotivo = '';
  protected rechazarError = '';

  protected openRechazarModal(): void {
    this.rechazarMotivo = '';
    this.rechazarError = '';
    this.showRechazarModal.set(true);
  }

  protected submitRechazar(): void {
    const obligacion = this.seguimientoObligacion();
    if (!obligacion) return;
    try {
      this.cuentasPorPagarService.rechazar(obligacion.id, this.rechazarMotivo);
      this.toastService.show(`Obligación ${obligacion.id} rechazada.`);
      this.showRechazarModal.set(false);
      this.refrescarSeguimiento(obligacion.id);
    } catch (error) {
      this.rechazarError = error instanceof Error ? error.message : 'No fue posible rechazar la obligación.';
    }
  }
}
