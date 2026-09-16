import { Component, computed, inject, input } from '@angular/core';
import { LucideDownload, LucideSlidersHorizontal } from '@lucide/angular';

import { Table } from '../../../../../shared/ui/table/table';
import { TableColumn } from '../../../../../shared/ui/table/table.model';
import { EntidadesService } from '../../../entidades.service';
import { ObligacionCartera } from '../../../models/entidad.model';

@Component({
  selector: 'app-cartera-estado-cuenta',
  imports: [Table, LucideDownload, LucideSlidersHorizontal],
  templateUrl: './cartera-estado-cuenta.html',
})
export class CarteraEstadoCuenta {
  private readonly entidadesService = inject(EntidadesService);

  readonly entidadId = input.required<string>();

  protected readonly columns: TableColumn<ObligacionCartera>[] = [
    { key: 'id', header: 'ID Obligación' },
    { key: 'periodo', header: 'Periodo' },
    { key: 'capitalAdeudadoLabel', header: 'Capital Adeudado', align: 'right' },
    { key: 'interesesGeneradosLabel', header: 'Intereses Generados', align: 'right' },
    { key: 'estadoPago', header: 'Estado de Pago' },
  ];

  protected readonly obligaciones = computed(() => this.entidadesService.getObligaciones(this.entidadId()));

  private readonly totalCapital = computed(() =>
    this.obligaciones().reduce((sum, obligacion) => sum + obligacion.capitalAdeudado, 0),
  );

  private readonly totalIntereses = computed(() =>
    this.obligaciones().reduce((sum, obligacion) => sum + obligacion.interesesGenerados, 0),
  );

  protected readonly totalCapitalLabel = computed(() => `$${this.totalCapital().toLocaleString('en-US')}`);
  protected readonly totalInteresesLabel = computed(() => `$${this.totalIntereses().toLocaleString('en-US')}`);

  protected readonly estadoResumen = computed(() => {
    let vencidas = 0;
    let pendientes = 0;
    let alDia = 0;

    for (const obligacion of this.obligaciones()) {
      if (obligacion.estadoPago.label === 'Vencida') {
        vencidas++;
      } else if (obligacion.estadoPago.label === 'Pendiente') {
        pendientes++;
      } else {
        alDia++;
      }
    }

    return `${vencidas} vencidas · ${pendientes} pendiente · ${alDia} al día`;
  });
}
