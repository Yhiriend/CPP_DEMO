import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideExternalLink } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { EntidadesService } from '../entidades/entidades.service';
import { ParametrizacionService } from '../parametrizacion/parametrizacion.service';
import { InteresesCalculoService } from './intereses-calculo.service';
import { InteresesDetalleRow } from './models/intereses-detalle.model';

@Component({
  selector: 'app-intereses',
  imports: [Breadcrumb, StatCard, Table, LucideExternalLink],
  templateUrl: './intereses.html',
})
export class Intereses {
  private readonly entidadesService = inject(EntidadesService);
  private readonly parametrizacionService = inject(ParametrizacionService);
  private readonly interesesCalculoService = inject(InteresesCalculoService);
  private readonly router = inject(Router);

  protected readonly columns: TableColumn<InteresesDetalleRow>[] = [
    { key: 'entidad', header: 'Entidad' },
    { key: 'obligacionId', header: 'ID Obligación' },
    { key: 'periodo', header: 'Periodo' },
    { key: 'capitalAdeudadoLabel', header: 'Capital Adeudado', align: 'right' },
    { key: 'fechaBaseMora', header: 'Fecha Base Mora' },
    { key: 'diasMora', header: 'Días Mora', align: 'right' },
    { key: 'tasaDtfAplicadaLabel', header: 'Tasa DTF Aplicada', align: 'right' },
    { key: 'interesesLabel', header: 'Interés Calculado', align: 'right' },
    { key: 'estadoPago', header: 'Estado' },
  ];

  /** Joins every entidad's obligaciones and recalculates interest live from the DTF vigente — HU-008/HU-009. */
  protected readonly detalle = computed<readonly InteresesDetalleRow[]>(() => {
    const tasaVigente = this.parametrizacionService.getTasaVigente();
    const tasaLabel = tasaVigente ? tasaVigente.tasa : '—';

    return this.entidadesService.entidades().flatMap((entidad) =>
      this.entidadesService.getObligaciones(entidad.id).map((obligacion) => {
        const calculo = this.interesesCalculoService.calcular(obligacion.capitalAdeudado, obligacion.fechaBaseMora);
        return {
          entidadId: entidad.id,
          entidad: entidad.nombre,
          obligacionId: obligacion.id,
          periodo: obligacion.periodo,
          capitalAdeudadoLabel: obligacion.capitalAdeudadoLabel,
          fechaBaseMora: obligacion.fechaBaseMora,
          diasMora: calculo.diasMora,
          tasaDtfAplicadaLabel: tasaLabel,
          interesesLabel: calculo.interesLabel,
          estadoPago: obligacion.estadoPago,
        };
      }),
    );
  });

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const filas = this.detalle();
    const tasaVigente = this.parametrizacionService.getTasaVigente();
    const totalIntereses = filas.reduce((sum, fila) => sum + this.parseCurrency(fila.interesesLabel), 0);
    const enMora = filas.filter((fila) => fila.diasMora > 0).length;

    return [
      {
        label: 'Tasa DTF Vigente',
        value: tasaVigente ? tasaVigente.tasa : '—',
        subtitle: tasaVigente ? `Vigente desde ${tasaVigente.vigenciaInicial}` : 'Sin tasa registrada',
      },
      {
        label: 'Total Intereses Calculados',
        value: `$${totalIntereses.toLocaleString('en-US')}`,
        subtitle: `${filas.length} obligaciones`,
      },
      {
        label: 'Obligaciones en Mora',
        value: `${enMora}`,
        subtitle: 'Días mora > 0',
      },
      {
        label: 'Obligaciones al Día',
        value: `${filas.length - enMora}`,
        subtitle: 'Sin días de mora',
      },
    ];
  });

  protected verFicha(fila: InteresesDetalleRow): void {
    this.router.navigate(['/entidades', fila.entidadId]);
  }

  private parseCurrency(label: string): number {
    return Number(label.replace(/[^0-9-]/g, '')) || 0;
  }
}
