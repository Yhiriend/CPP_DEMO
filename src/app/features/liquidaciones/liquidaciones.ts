import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucidePlus, LucideUpload } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { BulkUploadDialog } from '../../shared/ui/bulk-upload-dialog/bulk-upload-dialog';
import { BulkUploadOutcome } from '../../shared/ui/bulk-upload-dialog/bulk-upload-dialog.model';
import { Modal } from '../../shared/ui/modal/modal';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { calcularPorcentajeConcurrencia, calcularValorCuotaParte } from '../../shared/utils/liquidacion';
import { EntidadesService } from '../entidades/entidades.service';
import { PensionadosService } from '../pensionados/pensionados.service';
import { LIQUIDACION_TABS, LiquidacionTabId } from './liquidaciones-tabs';
import { LiquidacionesService } from './liquidaciones.service';
import {
  ConsolidadoLiquidacion,
  ESTADOS_LIQUIDACION,
  EstadoLiquidacion,
  Liquidacion,
  LiquidacionFormValue,
} from './models/liquidacion.model';

interface LiquidacionRow extends Liquidacion {
  readonly porcentajeConcurrenciaLabel: string;
}

@Component({
  selector: 'app-liquidaciones',
  imports: [Breadcrumb, Table, FormsModule, Modal, BulkUploadDialog, LucidePlus, LucideUpload],
  templateUrl: './liquidaciones.html',
})
export class Liquidaciones {
  private readonly liquidacionesService = inject(LiquidacionesService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly pensionadosService = inject(PensionadosService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tabs = LIQUIDACION_TABS;
  protected readonly activeTabId = signal<LiquidacionTabId>('todas');
  protected readonly entidades = this.entidadesService.entidades;
  protected readonly estados = ESTADOS_LIQUIDACION;

  protected selectTab(tabId: LiquidacionTabId): void {
    this.activeTabId.set(tabId);
  }

  // --- Tabla "Todas las Liquidaciones" ---

  protected readonly columns: TableColumn<LiquidacionRow>[] = [
    { key: 'idLiquidacion', header: 'ID Liquidación' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'pensionado', header: 'Pensionado' },
    { key: 'periodo', header: 'Periodo' },
    { key: 'porcentajeConcurrenciaLabel', header: '% Concurrencia', align: 'right' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly consolidadoColumns: TableColumn<ConsolidadoLiquidacion>[] = [
    { key: 'nombre', header: 'Nombre' },
    { key: 'cantidadLiquidaciones', header: 'N° Liquidaciones', align: 'right' },
    { key: 'capitalLabel', header: 'Capital Acumulado', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses Acumulados', align: 'right' },
    { key: 'totalLabel', header: 'Saldo Consolidado', align: 'right' },
  ];

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterEstado = '';
  protected filterPeriodo = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedEstado = signal('');
  private readonly appliedPeriodo = signal('');

  protected readonly periodos = computed(() =>
    Array.from(new Set(this.liquidacionesService.liquidaciones().map((l) => l.periodo))).sort(),
  );

  protected readonly filteredLiquidaciones = computed<readonly LiquidacionRow[]>(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const estado = this.appliedEstado();
    const periodo = this.appliedPeriodo();

    return this.liquidacionesService
      .liquidaciones()
      .filter((liquidacion) => {
        if (entidadId && liquidacion.entidadId !== entidadId) return false;
        if (estado && liquidacion.estado.label !== estado) return false;
        if (periodo && liquidacion.periodo !== periodo) return false;
        if (term) {
          const haystack = `${liquidacion.idLiquidacion} ${liquidacion.pensionado} ${liquidacion.entidad}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      })
      .map((liquidacion) => ({
        ...liquidacion,
        porcentajeConcurrenciaLabel: `${liquidacion.porcentajeConcurrencia.toFixed(2)}%`,
      }));
  });

  protected buscar(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedEstado.set(this.filterEstado);
    this.appliedPeriodo.set(this.filterPeriodo);
  }

  protected readonly totalCapitalLabel = computed(() => this.formatCurrency(this.sumBy(this.filteredLiquidaciones(), 'capital')));
  protected readonly totalInteresesLabel = computed(() =>
    this.formatCurrency(this.sumBy(this.filteredLiquidaciones(), 'intereses')),
  );

  protected readonly resumenEstados = computed(() => {
    const liquidaciones = this.filteredLiquidaciones();
    const conteo = (estado: EstadoLiquidacion) => liquidaciones.filter((l) => l.estado.label === estado).length;
    return `${conteo('Vigente')} vigentes · ${conteo('Procesada')} procesada · ${conteo('Error')} error · ${conteo('Borrador')} borrador`;
  });

  protected verDetalle(liquidacion: Liquidacion): void {
    this.router.navigate(['/pensionados', liquidacion.pensionadoId]);
  }

  // --- Consolidados por Entidad / Pensionado ---

  protected readonly consolidadoPorEntidad = computed(() => this.liquidacionesService.getConsolidadoPorEntidad());
  protected readonly consolidadoPorPensionado = computed(() => this.liquidacionesService.getConsolidadoPorPensionado());

  protected verEntidad(row: ConsolidadoLiquidacion): void {
    this.router.navigate(['/entidades', row.id]);
  }

  protected verPensionado(row: ConsolidadoLiquidacion): void {
    this.router.navigate(['/pensionados', row.id]);
  }

  // --- Generar Liquidación (individual) — HU-002 ---

  protected readonly showFormModal = signal(false);
  protected readonly pensionados = this.pensionadosService.pensionados;

  protected formPensionadoId = '';
  protected formPeriodo = '';
  protected formValorMesadaPensional: number | null = null;
  protected formDiasEntidad: number | null = null;
  protected formTotalDiasPension: number | null = null;
  protected formEstado: EstadoLiquidacion = 'Vigente';
  protected formError = '';

  protected openGenerarForm(): void {
    this.formPensionadoId = '';
    this.formPeriodo = '';
    this.formValorMesadaPensional = null;
    this.formDiasEntidad = null;
    this.formTotalDiasPension = null;
    this.formEstado = 'Vigente';
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected get formEntidadNombre(): string {
    return this.pensionadosService.getPensionadoById(this.formPensionadoId)?.entidadPrincipal ?? '—';
  }

  protected get previewPorcentaje(): number {
    return calcularPorcentajeConcurrencia(this.formDiasEntidad ?? 0, this.formTotalDiasPension ?? 0);
  }

  protected get previewCapitalLabel(): string {
    return this.formatCurrency(calcularValorCuotaParte(this.formValorMesadaPensional ?? 0, this.previewPorcentaje));
  }

  protected submitForm(): void {
    if (
      !this.formPensionadoId ||
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

    const value: LiquidacionFormValue = {
      pensionadoId: this.formPensionadoId,
      periodo: this.formPeriodo.trim(),
      valorMesadaPensional: this.formValorMesadaPensional,
      diasEntidad: this.formDiasEntidad,
      totalDiasPension: this.formTotalDiasPension,
      estado: this.formEstado,
    };

    const nueva = this.liquidacionesService.generarLiquidacion(value);
    this.toastService.show(`Liquidación ${nueva.idLiquidacion} generada correctamente.`);
    this.showFormModal.set(false);
  }

  // --- Cargue masivo de nómina FOPET ---

  protected readonly showBulkModal = signal(false);
  protected readonly bulkColumns = [
    'Documento Pensionado',
    'Periodo',
    'Valor Mesada Pensional',
    'Días Entidad',
    'Total Días Pensión',
    'Estado',
  ] as const;

  protected validateBulkRows = (rows: readonly Record<string, string>[]): BulkUploadOutcome<LiquidacionFormValue> => {
    const valid: { row: number; data: LiquidacionFormValue }[] = [];
    const rejected: { row: number; reason: string }[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const documento = row['Documento Pensionado']?.trim();
      const periodo = row['Periodo']?.trim();
      const valorMesadaPensional = Number(row['Valor Mesada Pensional']);
      const diasEntidad = Number(row['Días Entidad']);
      const totalDiasPension = Number(row['Total Días Pensión']);
      const estado = row['Estado']?.trim() as EstadoLiquidacion;

      if (!documento || !periodo || !estado) {
        rejected.push({ row: rowNumber, reason: 'Faltan campos obligatorios.' });
        return;
      }
      const pensionado = this.pensionadosService.getPensionadoByDocumento(documento);
      if (!pensionado) {
        rejected.push({ row: rowNumber, reason: `No existe un pensionado con documento ${documento}.` });
        return;
      }
      if (!Number.isFinite(valorMesadaPensional) || valorMesadaPensional <= 0) {
        rejected.push({ row: rowNumber, reason: 'Valor mesada pensional inválido.' });
        return;
      }
      if (!Number.isFinite(diasEntidad) || !Number.isFinite(totalDiasPension) || totalDiasPension <= 0) {
        rejected.push({ row: rowNumber, reason: 'Días entidad / total días pensión inválidos.' });
        return;
      }
      if (diasEntidad > totalDiasPension) {
        rejected.push({ row: rowNumber, reason: 'Días entidad no puede superar el total de días de la pensión.' });
        return;
      }
      if (!ESTADOS_LIQUIDACION.includes(estado)) {
        rejected.push({ row: rowNumber, reason: `Estado inválido: ${estado}.` });
        return;
      }

      valid.push({
        row: rowNumber,
        data: { pensionadoId: pensionado.id, periodo, valorMesadaPensional, diasEntidad, totalDiasPension, estado },
      });
    });

    return { valid, rejected };
  };

  protected confirmBulkUpload(values: readonly LiquidacionFormValue[]): void {
    this.liquidacionesService.bulkGenerar(values);
    this.toastService.show(`${values.length} liquidaciones generadas desde el cargue de nómina FOPET.`);
    this.showBulkModal.set(false);
  }

  private sumBy(liquidaciones: readonly Liquidacion[], key: 'capital' | 'intereses'): number {
    return liquidaciones.reduce((sum, liquidacion) => sum + liquidacion[key], 0);
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
