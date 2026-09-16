import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideCircleCheck,
  LucideCircleX,
  LucidePlus,
  LucideSquarePen,
  LucideUpload,
} from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { BulkUploadDialog } from '../../shared/ui/bulk-upload-dialog/bulk-upload-dialog';
import { BulkUploadOutcome } from '../../shared/ui/bulk-upload-dialog/bulk-upload-dialog.model';
import { Modal } from '../../shared/ui/modal/modal';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { EntidadesService } from '../entidades/entidades.service';
import {
  ESTADOS_PENSIONADO,
  EstadoPensionado,
  Pensionado,
  PensionadoFormValue,
  TIPOS_DOCUMENTO,
  TipoDocumento,
} from './models/pensionado.model';
import { PensionadosService } from './pensionados.service';

@Component({
  selector: 'app-pensionados',
  imports: [Breadcrumb, Table, FormsModule, Modal, BulkUploadDialog, LucidePlus, LucideSquarePen, LucideCircleCheck, LucideCircleX, LucideUpload],
  templateUrl: './pensionados.html',
})
export class Pensionados {
  private readonly pensionadosService = inject(PensionadosService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly estadosPensionado = ESTADOS_PENSIONADO;
  protected readonly entidades = this.entidadesService.entidades;

  protected readonly columns: TableColumn<Pensionado>[] = [
    { key: 'tipoDocumento', header: 'Tipo Doc.' },
    { key: 'numeroDocumento', header: 'Número Documento' },
    { key: 'nombresApellidos', header: 'Nombres y Apellidos' },
    { key: 'entidadPrincipal', header: 'Entidad Principal Asociada' },
    { key: 'estado', header: 'Estado' },
  ];

  private readonly pensionados = this.pensionadosService.pensionados;

  protected documentoBusqueda = '';
  protected nombreBusqueda = '';
  private readonly appliedDocumento = signal('');
  private readonly appliedNombre = signal('');

  protected readonly filteredPensionados = computed(() => {
    const documento = this.appliedDocumento().trim().toLowerCase();
    const nombre = this.appliedNombre().trim().toLowerCase();

    return this.pensionados().filter((pensionado) => {
      const matchesDocumento = !documento || pensionado.numeroDocumento.toLowerCase().includes(documento);
      const matchesNombre = !nombre || pensionado.nombresApellidos.toLowerCase().includes(nombre);
      return matchesDocumento && matchesNombre;
    });
  });

  protected search(): void {
    this.appliedDocumento.set(this.documentoBusqueda);
    this.appliedNombre.set(this.nombreBusqueda);
  }

  protected verDetalle(pensionado: Pensionado): void {
    this.router.navigate(['/pensionados', pensionado.id]);
  }

  // --- Crear / Editar ---

  protected readonly showFormModal = signal(false);
  protected readonly editingPensionado = signal<Pensionado | null>(null);
  protected formTipoDocumento: TipoDocumento = 'C.C.';
  protected formNumeroDocumento = '';
  protected formNombres = '';
  protected formEntidadId = '';
  protected formEstado: EstadoPensionado = 'Activo';
  protected formError = '';

  protected openCreateForm(): void {
    this.editingPensionado.set(null);
    this.formTipoDocumento = 'C.C.';
    this.formNumeroDocumento = '';
    this.formNombres = '';
    this.formEntidadId = '';
    this.formEstado = 'Activo';
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected openEditForm(pensionado: Pensionado): void {
    this.editingPensionado.set(pensionado);
    this.formTipoDocumento = pensionado.tipoDocumento.label as TipoDocumento;
    this.formNumeroDocumento = pensionado.numeroDocumento;
    this.formNombres = pensionado.nombresApellidos;
    this.formEntidadId = pensionado.entidadId;
    this.formEstado = pensionado.estado.label as EstadoPensionado;
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected submitForm(): void {
    const numeroDocumento = this.formNumeroDocumento.trim();
    const nombres = this.formNombres.trim();

    if (!numeroDocumento || !nombres || !this.formEntidadId) {
      this.formError = 'Complete todos los campos obligatorios.';
      return;
    }

    const editing = this.editingPensionado();
    if (this.pensionadosService.existsDocumento(numeroDocumento, editing?.id)) {
      this.formError = 'Ya existe un pensionado registrado con este documento.';
      return;
    }

    const value: PensionadoFormValue = {
      tipoDocumento: this.formTipoDocumento,
      numeroDocumento,
      nombresApellidos: nombres,
      entidadId: this.formEntidadId,
      estado: this.formEstado,
    };

    if (editing) {
      this.pensionadosService.updatePensionado(editing.id, value);
      this.toastService.show(`Pensionado "${nombres}" actualizado correctamente.`);
    } else {
      this.pensionadosService.createPensionado(value);
      this.toastService.show(`Pensionado "${nombres}" creado correctamente.`);
    }

    this.showFormModal.set(false);
  }

  // --- Activar / Inactivar ---

  protected toggleEstado(pensionado: Pensionado): void {
    if (pensionado.estado.label === 'Activo') {
      this.pensionadosService.inactivar(pensionado.id);
      this.toastService.show(`Pensionado "${pensionado.nombresApellidos}" inactivado.`);
    } else {
      this.pensionadosService.activar(pensionado.id);
      this.toastService.show(`Pensionado "${pensionado.nombresApellidos}" activado.`);
    }
  }

  // --- Cargue masivo ---

  protected readonly showBulkModal = signal(false);
  protected readonly bulkColumns = ['TipoDocumento', 'NumeroDocumento', 'Nombres', 'NitEntidad', 'Estado'] as const;

  protected validateBulkRows = (rows: readonly Record<string, string>[]): BulkUploadOutcome<PensionadoFormValue> => {
    const valid: { row: number; data: PensionadoFormValue }[] = [];
    const rejected: { row: number; reason: string }[] = [];
    const seenDocumentos = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const tipoDocumento = row['TipoDocumento']?.trim();
      const numeroDocumento = row['NumeroDocumento']?.trim();
      const nombres = row['Nombres']?.trim();
      const nitEntidad = row['NitEntidad']?.trim();
      const estado = row['Estado']?.trim();

      if (!tipoDocumento || !numeroDocumento || !nombres || !nitEntidad || !estado) {
        rejected.push({ row: rowNumber, reason: 'Faltan campos obligatorios.' });
        return;
      }
      if (this.pensionadosService.existsDocumento(numeroDocumento) || seenDocumentos.has(numeroDocumento)) {
        rejected.push({ row: rowNumber, reason: `Documento duplicado: ${numeroDocumento}.` });
        return;
      }
      const entidad = this.entidades().find((e) => e.codigoNit === nitEntidad);
      if (!entidad) {
        rejected.push({ row: rowNumber, reason: `No existe una entidad con NIT ${nitEntidad}.` });
        return;
      }
      seenDocumentos.add(numeroDocumento);
      valid.push({
        row: rowNumber,
        data: {
          tipoDocumento: tipoDocumento as TipoDocumento,
          numeroDocumento,
          nombresApellidos: nombres,
          entidadId: entidad.id,
          estado: estado as EstadoPensionado,
        },
      });
    });

    return { valid, rejected };
  };

  protected confirmBulkUpload(values: readonly PensionadoFormValue[]): void {
    this.pensionadosService.bulkCreate(values);
    this.toastService.show(`${values.length} pensionados cargados correctamente.`);
    this.showBulkModal.set(false);
  }
}
