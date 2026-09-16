import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCircleCheck, LucideCircleX, LucidePlus, LucideSquarePen } from '@lucide/angular';

import { Modal } from '../../../../../shared/ui/modal/modal';
import { Table } from '../../../../../shared/ui/table/table';
import { TableColumn } from '../../../../../shared/ui/table/table.model';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { BeneficiariosService } from '../../../beneficiarios.service';
import {
  Beneficiario,
  BeneficiarioFormValue,
  ESTADOS_BENEFICIARIO,
  EstadoBeneficiario,
  PARENTESCOS,
  Parentesco,
} from '../../../models/beneficiario.model';
import { TIPOS_DOCUMENTO, TipoDocumento } from '../../../models/pensionado.model';

@Component({
  selector: 'app-beneficiarios-tab',
  imports: [Table, FormsModule, Modal, LucidePlus, LucideSquarePen, LucideCircleCheck, LucideCircleX],
  templateUrl: './beneficiarios-tab.html',
})
export class BeneficiariosTab {
  private readonly beneficiariosService = inject(BeneficiariosService);
  private readonly toastService = inject(ToastService);

  readonly pensionadoId = input.required<string>();

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly parentescos = PARENTESCOS;
  protected readonly estadosBeneficiario = ESTADOS_BENEFICIARIO;

  protected readonly columns: TableColumn<Beneficiario>[] = [
    { key: 'tipoDocumento', header: 'Tipo Doc.' },
    { key: 'numeroDocumento', header: 'Número Documento' },
    { key: 'nombresApellidos', header: 'Nombres y Apellidos' },
    { key: 'parentesco', header: 'Parentesco' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly beneficiarios = computed(() => this.beneficiariosService.getByPensionado(this.pensionadoId()));

  // --- Crear / Editar ---

  protected readonly showFormModal = signal(false);
  protected readonly editingBeneficiario = signal<Beneficiario | null>(null);
  protected formTipoDocumento: TipoDocumento = 'C.C.';
  protected formNumeroDocumento = '';
  protected formNombres = '';
  protected formParentesco: Parentesco = 'Hijo/a';
  protected formEstado: EstadoBeneficiario = 'Activo';
  protected formError = '';

  protected openCreateForm(): void {
    this.editingBeneficiario.set(null);
    this.formTipoDocumento = 'C.C.';
    this.formNumeroDocumento = '';
    this.formNombres = '';
    this.formParentesco = 'Hijo/a';
    this.formEstado = 'Activo';
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected openEditForm(beneficiario: Beneficiario): void {
    this.editingBeneficiario.set(beneficiario);
    this.formTipoDocumento = beneficiario.tipoDocumento.label as TipoDocumento;
    this.formNumeroDocumento = beneficiario.numeroDocumento;
    this.formNombres = beneficiario.nombresApellidos;
    this.formParentesco = beneficiario.parentesco as Parentesco;
    this.formEstado = beneficiario.estado.label as EstadoBeneficiario;
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected submitForm(): void {
    const numeroDocumento = this.formNumeroDocumento.trim();
    const nombres = this.formNombres.trim();

    if (!numeroDocumento || !nombres) {
      this.formError = 'Complete todos los campos obligatorios.';
      return;
    }

    const editing = this.editingBeneficiario();
    if (this.beneficiariosService.existsDocumento(numeroDocumento, editing?.id)) {
      this.formError = 'Ya existe un beneficiario registrado con este documento.';
      return;
    }

    const value: BeneficiarioFormValue = {
      tipoDocumento: this.formTipoDocumento,
      numeroDocumento,
      nombresApellidos: nombres,
      parentesco: this.formParentesco,
      estado: this.formEstado,
    };

    if (editing) {
      this.beneficiariosService.updateBeneficiario(editing.id, value);
      this.toastService.show(`Beneficiario "${nombres}" actualizado correctamente.`);
    } else {
      this.beneficiariosService.createBeneficiario(this.pensionadoId(), value);
      this.toastService.show(`Beneficiario "${nombres}" creado correctamente.`);
    }

    this.showFormModal.set(false);
  }

  // --- Activar / Inactivar ---

  protected toggleEstado(beneficiario: Beneficiario): void {
    if (beneficiario.estado.label === 'Activo') {
      this.beneficiariosService.inactivar(beneficiario.id);
      this.toastService.show(`Beneficiario "${beneficiario.nombresApellidos}" inactivado.`);
    } else {
      this.beneficiariosService.activar(beneficiario.id);
      this.toastService.show(`Beneficiario "${beneficiario.nombresApellidos}" activado.`);
    }
  }
}
