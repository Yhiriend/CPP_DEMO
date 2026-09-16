import { Component, inject } from '@angular/core';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { CuentasDeCobroService } from './cuentas-de-cobro.service';
import { CuentaCobro } from './models/cuenta-cobro.model';

@Component({
  selector: 'app-cuentas-de-cobro',
  imports: [Breadcrumb, Table, LucideDownload, LucidePlus],
  templateUrl: './cuentas-de-cobro.html',
})
export class CuentasDeCobro {
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);

  protected readonly cuentasCobro = this.cuentasDeCobroService.getCuentasCobro();

  protected readonly columns: TableColumn<CuentaCobro>[] = [
    { key: 'idCuenta', header: 'ID Cuenta' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'fechaVencimiento', header: 'Fecha Vencimiento' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly totalCapitalLabel = this.formatTotal(
    this.cuentasCobro.reduce((sum, cuenta) => sum + cuenta.capital, 0),
  );

  protected readonly totalInteresesLabel = this.formatTotal(
    this.cuentasCobro.reduce((sum, cuenta) => sum + cuenta.intereses, 0),
  );

  protected readonly resumenEstados = this.buildResumenEstados();

  private formatTotal(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }

  private buildResumenEstados(): string {
    const radicadas = this.cuentasCobro.filter((c) => c.estado.label === 'Radicada').length;
    const pendientes = this.cuentasCobro.filter((c) => c.estado.label === 'Pendiente').length;
    const vencidas = this.cuentasCobro.filter((c) => c.estado.label === 'Vencida').length;
    const borradores = this.cuentasCobro.filter((c) => c.estado.label === 'Borrador').length;
    const anuladas = this.cuentasCobro.filter((c) => c.estado.label === 'Anulada').length;
    return (
      `${radicadas} radicada · ${pendientes} pendiente · ${vencidas} vencida · ` +
      `${borradores} borrador · ${anuladas} anulada`
    );
  }
}
