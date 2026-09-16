import { Component, inject } from '@angular/core';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { AcuerdosService } from './acuerdos.service';
import { Acuerdo } from './models/acuerdo.model';

@Component({
  selector: 'app-acuerdos',
  imports: [Table, LucideDownload, LucidePlus],
  templateUrl: './acuerdos.html',
})
export class Acuerdos {
  private readonly acuerdosService = inject(AcuerdosService);

  protected readonly acuerdos = this.acuerdosService.getAcuerdos();

  protected readonly columns: TableColumn<Acuerdo>[] = [
    { key: 'idRadicado', header: 'ID Radicado' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'tipoAcuerdo', header: 'Tipo de Acuerdo' },
    { key: 'valorSolicitado', header: 'Valor Solicitado' },
    { key: 'fechaRadicacion', header: 'Fecha Radicación' },
    { key: 'estado', header: 'Estado' },
  ];
}
