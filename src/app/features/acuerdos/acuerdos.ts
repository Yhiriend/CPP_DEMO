import { Component, inject } from '@angular/core';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AcuerdosService } from './acuerdos.service';
import { Acuerdo } from './models/acuerdo.model';

@Component({
  selector: 'app-acuerdos',
  imports: [Table, LucideDownload, LucidePlus],
  templateUrl: './acuerdos.html',
})
export class Acuerdos {
  private readonly acuerdosService = inject(AcuerdosService);
  private readonly toastService = inject(ToastService);

  protected readonly acuerdos = this.acuerdosService.getAcuerdos();

  protected readonly columns: TableColumn<Acuerdo>[] = [
    { key: 'idRadicado', header: 'ID Radicado' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'tipoAcuerdo', header: 'Tipo de Acuerdo' },
    { key: 'valorSolicitado', header: 'Valor Solicitado' },
    { key: 'fechaRadicacion', header: 'Fecha Radicación' },
    { key: 'estado', header: 'Estado' },
  ];

  protected exportar(): void {
    this.toastService.show('La exportación a CSV estará disponible próximamente.');
  }

  protected radicarSolicitud(): void {
    this.toastService.show('Radicar una nueva solicitud estará disponible cuando el backend esté conectado.');
  }

  protected verSeguimiento(acuerdo: Acuerdo): void {
    this.toastService.show(`El seguimiento de ${acuerdo.idRadicado} estará disponible próximamente.`);
  }
}
