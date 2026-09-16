import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucideInfo, LucidePlus, LucideSearch, LucideSquarePen } from '@lucide/angular';

import { Modal } from '../../../../shared/ui/modal/modal';
import { Table } from '../../../../shared/ui/table/table';
import { TableColumn } from '../../../../shared/ui/table/table.model';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DtfRate } from '../../models/dtf-rate.model';
import { ParametrizacionService } from '../../parametrizacion.service';

@Component({
  selector: 'app-dtf-rate-settings',
  imports: [Table, FormsModule, Modal, LucideDownload, LucideInfo, LucidePlus, LucideSearch, LucideSquarePen],
  templateUrl: './dtf-rate-settings.html',
})
export class DtfRateSettings {
  private readonly parametrizacionService = inject(ParametrizacionService);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn<DtfRate>[] = [
    { key: 'codigo', header: 'Código' },
    { key: 'periodo', header: 'Periodo / Mes-Año' },
    { key: 'tasa', header: 'Tasa DTF %' },
    { key: 'fechaRegistro', header: 'Fecha Registro' },
    { key: 'usuarioResponsable', header: 'Usuario Resp.' },
  ];

  private readonly rates = this.parametrizacionService.dtfRates;

  protected searchTerm = '';
  private readonly appliedSearchTerm = signal('');

  protected readonly filteredRates = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.rates();
    }
    return this.rates().filter((rate) =>
      [rate.codigo, rate.periodo, rate.usuarioResponsable].some((field) => field.toLowerCase().includes(term)),
    );
  });

  // --- Registrar nueva tasa ---

  protected tasaValue: number | null = null;
  protected vigenciaInicial = '';
  protected formError = '';

  protected search(): void {
    this.appliedSearchTerm.set(this.searchTerm);
  }

  protected submitNewRate(): void {
    if (this.tasaValue === null || Number.isNaN(this.tasaValue) || this.tasaValue <= 0) {
      this.formError = 'Ingrese un valor de tasa válido.';
      return;
    }

    if (!this.vigenciaInicial) {
      this.formError = 'Seleccione la vigencia inicial.';
      return;
    }

    this.parametrizacionService.registerDtfRate({
      tasa: this.tasaValue,
      vigenciaInicial: this.vigenciaInicial,
    });

    this.formError = '';
    this.tasaValue = null;
    this.vigenciaInicial = '';
    this.toastService.show('Tasa DTF registrada correctamente.');
  }

  protected exportarHistorico(): void {
    this.toastService.show('La exportación a CSV/PDF estará disponible próximamente.');
  }

  // --- Editar tasa existente ---

  protected readonly showEditModal = signal(false);
  protected readonly editingRate = signal<DtfRate | null>(null);
  protected editTasaValue: number | null = null;
  protected editVigenciaInicial = '';
  protected editFormError = '';

  protected editarTasa(rate: DtfRate): void {
    this.editingRate.set(rate);
    this.editTasaValue = rate.tasaValor;
    this.editVigenciaInicial = rate.vigenciaInicial;
    this.editFormError = '';
    this.showEditModal.set(true);
  }

  protected submitEdit(): void {
    if (this.editTasaValue === null || Number.isNaN(this.editTasaValue) || this.editTasaValue <= 0) {
      this.editFormError = 'Ingrese un valor de tasa válido.';
      return;
    }

    if (!this.editVigenciaInicial) {
      this.editFormError = 'Seleccione la vigencia inicial.';
      return;
    }

    const rate = this.editingRate();
    if (!rate) {
      return;
    }

    this.parametrizacionService.updateDtfRate(rate.codigo, {
      tasa: this.editTasaValue,
      vigenciaInicial: this.editVigenciaInicial,
    });

    this.showEditModal.set(false);
    this.toastService.show(`Tasa ${rate.codigo} actualizada correctamente.`);
  }
}
