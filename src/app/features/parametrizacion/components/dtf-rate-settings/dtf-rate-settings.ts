import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucideInfo, LucidePlus, LucideSearch, LucideSquarePen } from '@lucide/angular';

import { Table } from '../../../../shared/ui/table/table';
import { TableColumn } from '../../../../shared/ui/table/table.model';
import { DtfRate } from '../../models/dtf-rate.model';
import { ParametrizacionService } from '../../parametrizacion.service';

@Component({
  selector: 'app-dtf-rate-settings',
  imports: [Table, FormsModule, LucideDownload, LucideInfo, LucidePlus, LucideSearch, LucideSquarePen],
  templateUrl: './dtf-rate-settings.html',
})
export class DtfRateSettings {
  private readonly parametrizacionService = inject(ParametrizacionService);

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
  }
}
