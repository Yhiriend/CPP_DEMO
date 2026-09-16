import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideDownload, LucideExternalLink, LucideSlidersHorizontal } from '@lucide/angular';

import { Table } from '../../../../shared/ui/table/table';
import { TableColumn } from '../../../../shared/ui/table/table.model';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { CarteraService } from '../../cartera.service';
import { CarteraPorEntidad } from '../../models/cartera.model';

@Component({
  selector: 'app-estado-cuenta-general',
  imports: [Table, LucideDownload, LucideExternalLink, LucideSlidersHorizontal],
  templateUrl: './estado-cuenta-general.html',
})
export class EstadoCuentaGeneral {
  private readonly carteraService = inject(CarteraService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn<CarteraPorEntidad>[] = [
    { key: 'nit', header: 'NIT' },
    { key: 'nombre', header: 'Entidad Concurrente' },
    { key: 'obligacionesPendientes', header: 'Oblig. Pendientes', align: 'right' },
    { key: 'capitalAdeudadoLabel', header: 'Capital Adeudado', align: 'right' },
    { key: 'interesesGeneradosLabel', header: 'Intereses Generados', align: 'right' },
    { key: 'totalDeudaLabel', header: 'Total Deuda', align: 'right' },
    { key: 'cobertura', header: '% Cobertura', align: 'right' },
  ];

  protected readonly filasCartera = this.carteraService.getCarteraPorEntidad();

  protected readonly totalObligaciones = this.filasCartera.reduce(
    (sum, fila) => sum + fila.obligacionesPendientes,
    0,
  );

  protected readonly totalCapitalLabel = this.formatTotal(
    this.filasCartera.reduce((sum, fila) => sum + fila.capitalAdeudado, 0),
  );

  protected readonly totalInteresesLabel = this.formatTotal(
    this.filasCartera.reduce((sum, fila) => sum + fila.interesesGenerados, 0),
  );

  protected readonly totalDeudaLabel = this.formatTotal(
    this.filasCartera.reduce((sum, fila) => sum + fila.totalDeuda, 0),
  );

  protected verFicha(fila: CarteraPorEntidad): void {
    this.router.navigate(['/entidades', fila.entidadId]);
  }

  protected aplicarFiltros(): void {
    this.toastService.show('Los filtros avanzados estarán disponibles próximamente.');
  }

  protected limpiarFiltros(): void {
    this.toastService.show('Los filtros avanzados estarán disponibles próximamente.');
  }

  protected exportar(): void {
    this.toastService.show('La exportación a Excel/PDF estará disponible próximamente.');
  }

  private formatTotal(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
