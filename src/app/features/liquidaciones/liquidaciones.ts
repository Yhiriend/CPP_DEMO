import { Component, inject } from '@angular/core';
import { LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { LiquidacionesService } from './liquidaciones.service';
import { Liquidacion } from './models/liquidacion.model';

@Component({
  selector: 'app-liquidaciones',
  imports: [Breadcrumb, Table, LucidePlus],
  templateUrl: './liquidaciones.html',
})
export class Liquidaciones {
  private readonly liquidacionesService = inject(LiquidacionesService);
  private readonly toastService = inject(ToastService);

  protected readonly liquidaciones = this.liquidacionesService.getLiquidaciones();

  protected readonly columns: TableColumn<Liquidacion>[] = [
    { key: 'idLiquidacion', header: 'ID Liquidación' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'pensionado', header: 'Pensionado' },
    { key: 'periodo', header: 'Periodo' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly totalCapitalLabel = this.formatTotal(
    this.liquidaciones.reduce((sum, liquidacion) => sum + liquidacion.capital, 0),
  );

  protected readonly totalInteresesLabel = this.formatTotal(
    this.liquidaciones.reduce((sum, liquidacion) => sum + liquidacion.intereses, 0),
  );

  protected readonly resumenEstados = this.buildResumenEstados();

  protected buscar(): void {
    this.toastService.show('Los filtros avanzados estarán disponibles próximamente.');
  }

  protected generarLiquidacion(): void {
    this.toastService.show('Generar una liquidación estará disponible cuando el backend esté conectado.');
  }

  protected verDetalle(liquidacion: Liquidacion): void {
    this.toastService.show(`El detalle de ${liquidacion.idLiquidacion} estará disponible próximamente.`);
  }

  private formatTotal(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }

  private buildResumenEstados(): string {
    const vigentes = this.liquidaciones.filter((l) => l.estado.label === 'Vigente').length;
    const procesadas = this.liquidaciones.filter((l) => l.estado.label === 'Procesada').length;
    const errores = this.liquidaciones.filter((l) => l.estado.label === 'Error').length;
    const borradores = this.liquidaciones.filter((l) => l.estado.label === 'Borrador').length;
    return `${vigentes} vigentes · ${procesadas} procesada · ${errores} error · ${borradores} borrador`;
  }
}
