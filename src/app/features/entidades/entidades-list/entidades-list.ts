import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideCircleCheck,
  LucideCircleX,
  LucidePlus,
  LucideSearch,
  LucideSquarePen,
  LucideUpload,
} from '@lucide/angular';

import { Breadcrumb } from '../../../shared/ui/breadcrumb/breadcrumb';
import { BulkUploadDialog } from '../../../shared/ui/bulk-upload-dialog/bulk-upload-dialog';
import { BulkUploadOutcome } from '../../../shared/ui/bulk-upload-dialog/bulk-upload-dialog.model';
import { Modal } from '../../../shared/ui/modal/modal';
import { SystemStatusBar } from '../../../shared/ui/system-status-bar/system-status-bar';
import { Table } from '../../../shared/ui/table/table';
import { TableColumn } from '../../../shared/ui/table/table.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { EntidadesService } from '../entidades.service';
import { Entidad, EntidadFormValue, EstadoEntidad, TIPOS_ENTIDAD } from '../models/entidad.model';

@Component({
  selector: 'app-entidades-list',
  imports: [
    Table,
    FormsModule,
    Breadcrumb,
    SystemStatusBar,
    Modal,
    BulkUploadDialog,
    LucidePlus,
    LucideSearch,
    LucideSquarePen,
    LucideCircleCheck,
    LucideCircleX,
    LucideUpload,
  ],
  templateUrl: './entidades-list.html',
})
export class EntidadesList {
  private readonly entidadesService = inject(EntidadesService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly tiposEntidad = TIPOS_ENTIDAD;

  protected readonly columns: TableColumn<Entidad>[] = [
    { key: 'codigoNit', header: 'Código / NIT' },
    { key: 'nombre', header: 'Nombre Entidad' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'totalPensionados', header: 'Total Pensionados', align: 'right' },
    { key: 'saldoCarteraTotal', header: 'Saldo de Cartera Total', align: 'right' },
    { key: 'estado', header: 'Estado' },
  ];

  private readonly entidades = this.entidadesService.entidades;

  protected searchTerm = '';
  private readonly appliedSearchTerm = signal('');

  protected readonly filteredEntidades = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.entidades();
    }
    return this.entidades().filter((entidad) =>
      [entidad.nombre, entidad.codigoNit].some((field) => field.toLowerCase().includes(term)),
    );
  });

  protected search(): void {
    this.appliedSearchTerm.set(this.searchTerm);
  }

  protected verDetalle(entidad: Entidad): void {
    this.router.navigate(['/entidades', entidad.id]);
  }

  // --- Crear / Editar ---

  protected readonly showFormModal = signal(false);
  protected readonly editingEntidad = signal<Entidad | null>(null);
  protected formNit = '';
  protected formNombre = '';
  protected formTipo = '';
  protected formEstado: EstadoEntidad = 'Activa';
  protected formError = '';

  protected openCreateForm(): void {
    this.editingEntidad.set(null);
    this.formNit = '';
    this.formNombre = '';
    this.formTipo = '';
    this.formEstado = 'Activa';
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected openEditForm(entidad: Entidad): void {
    this.editingEntidad.set(entidad);
    this.formNit = entidad.codigoNit;
    this.formNombre = entidad.nombre;
    this.formTipo = entidad.tipo;
    this.formEstado = entidad.estado.label as EstadoEntidad;
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected submitForm(): void {
    const nit = this.formNit.trim();
    const nombre = this.formNombre.trim();

    if (!nit || !nombre || !this.formTipo) {
      this.formError = 'Complete todos los campos obligatorios.';
      return;
    }

    const editing = this.editingEntidad();
    if (this.entidadesService.existsNit(nit, editing?.id)) {
      this.formError = 'Ya existe una entidad registrada con este NIT.';
      return;
    }

    const value: EntidadFormValue = { codigoNit: nit, nombre, tipo: this.formTipo, estado: this.formEstado };

    if (editing) {
      this.entidadesService.updateEntidad(editing.id, value);
      this.toastService.show(`Entidad "${nombre}" actualizada correctamente.`);
    } else {
      this.entidadesService.createEntidad(value);
      this.toastService.show(`Entidad "${nombre}" creada correctamente.`);
    }

    this.showFormModal.set(false);
  }

  // --- Activar / Inactivar ---

  protected toggleEstado(entidad: Entidad): void {
    if (entidad.estado.label === 'Activa') {
      this.entidadesService.inactivar(entidad.id);
      this.toastService.show(`Entidad "${entidad.nombre}" inactivada.`);
    } else {
      this.entidadesService.activar(entidad.id);
      this.toastService.show(`Entidad "${entidad.nombre}" activada.`);
    }
  }

  // --- Cargue masivo ---

  protected readonly showBulkModal = signal(false);
  protected readonly bulkColumns = ['NIT', 'Nombre', 'Tipo', 'Estado'] as const;

  protected validateBulkRows = (rows: readonly Record<string, string>[]): BulkUploadOutcome<EntidadFormValue> => {
    const valid: { row: number; data: EntidadFormValue }[] = [];
    const rejected: { row: number; reason: string }[] = [];
    const seenNits = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const nit = row['NIT']?.trim();
      const nombre = row['Nombre']?.trim();
      const tipo = row['Tipo']?.trim();
      const estado = row['Estado']?.trim();

      if (!nit || !nombre || !tipo || !estado) {
        rejected.push({ row: rowNumber, reason: 'Faltan campos obligatorios.' });
        return;
      }
      if (this.entidadesService.existsNit(nit) || seenNits.has(nit)) {
        rejected.push({ row: rowNumber, reason: `NIT duplicado: ${nit}.` });
        return;
      }
      seenNits.add(nit);
      valid.push({ row: rowNumber, data: { codigoNit: nit, nombre, tipo, estado: estado as EstadoEntidad } });
    });

    return { valid, rejected };
  };

  protected confirmBulkUpload(values: readonly EntidadFormValue[]): void {
    this.entidadesService.bulkCreate(values);
    this.toastService.show(`${values.length} entidades cargadas correctamente.`);
    this.showBulkModal.set(false);
  }
}
