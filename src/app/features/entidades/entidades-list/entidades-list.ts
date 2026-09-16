import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucidePlus, LucideSearch } from '@lucide/angular';

import { Breadcrumb } from '../../../shared/ui/breadcrumb/breadcrumb';
import { SystemStatusBar } from '../../../shared/ui/system-status-bar/system-status-bar';
import { Table } from '../../../shared/ui/table/table';
import { TableColumn } from '../../../shared/ui/table/table.model';
import { EntidadesService } from '../entidades.service';
import { Entidad } from '../models/entidad.model';

@Component({
  selector: 'app-entidades-list',
  imports: [Table, FormsModule, Breadcrumb, SystemStatusBar, LucidePlus, LucideSearch],
  templateUrl: './entidades-list.html',
})
export class EntidadesList {
  private readonly entidadesService = inject(EntidadesService);
  private readonly router = inject(Router);

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
}
