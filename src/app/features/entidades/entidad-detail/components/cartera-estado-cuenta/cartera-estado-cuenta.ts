import { Component, computed, inject, input } from '@angular/core';
import { LucideDownload, LucideSlidersHorizontal } from '@lucide/angular';

import { InteresesCalculoService } from '../../../../intereses/intereses-calculo.service';
import { Table } from '../../../../../shared/ui/table/table';
import { TableColumn } from '../../../../../shared/ui/table/table.model';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { EntidadesService } from '../../../entidades.service';
import { ObligacionCartera } from '../../../models/entidad.model';

interface ObligacionConIntereses extends ObligacionCartera {
  readonly diasMora: number;
  readonly interesesGenerados: number;
  readonly interesesGeneradosLabel: string;
}

@Component({
  selector: 'app-cartera-estado-cuenta',
  imports: [Table, LucideDownload, LucideSlidersHorizontal],
  templateUrl: './cartera-estado-cuenta.html',
})
export class CarteraEstadoCuenta {
  private readonly entidadesService = inject(EntidadesService);
  private readonly interesesCalculoService = inject(InteresesCalculoService);
  private readonly toastService = inject(ToastService);

  readonly entidadId = input.required<string>();

  protected readonly columns: TableColumn<ObligacionConIntereses>[] = [
    { key: 'id', header: 'ID Obligación' },
    { key: 'periodo', header: 'Periodo' },
    { key: 'capitalAdeudadoLabel', header: 'Capital Adeudado', align: 'right' },
    { key: 'diasMora', header: 'Días Mora', align: 'right' },
    { key: 'interesesGeneradosLabel', header: 'Intereses Generados', align: 'right' },
    { key: 'estadoPago', header: 'Estado de Pago' },
  ];

  /** Recalculated on every read from the current DTF vigente — HU-009. */
  protected readonly obligaciones = computed<readonly ObligacionConIntereses[]>(() =>
    this.entidadesService.getObligaciones(this.entidadId()).map((obligacion) => {
      const calculo = this.interesesCalculoService.calcular(obligacion.capitalAdeudado, obligacion.fechaBaseMora);
      return {
        ...obligacion,
        diasMora: calculo.diasMora,
        interesesGenerados: calculo.interes,
        interesesGeneradosLabel: calculo.interesLabel,
      };
    }),
  );

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

  protected filtrar(): void {
    this.toastService.show('Los filtros avanzados estarán disponibles próximamente.');
  }

  protected exportar(): void {
    this.toastService.show('La exportación a PDF estará disponible próximamente.');
  }
}
