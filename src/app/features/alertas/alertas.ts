import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDownload } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableBadge, TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { EntidadesService } from '../entidades/entidades.service';
import { AlertasService } from './alertas.service';
import { Alerta, CATEGORIAS_ALERTA, SEVERIDADES_ALERTA, SeveridadAlerta } from './models/alerta.model';

interface AlertaRow extends Alerta {
  readonly severidadVisual: TableBadge;
}

const SEVERIDAD_VARIANT: Record<SeveridadAlerta, TableBadge['variant']> = {
  Crítica: 'danger',
  Alta: 'warning',
  Media: 'info',
  Baja: 'neutral',
};

@Component({
  selector: 'app-alertas',
  imports: [Breadcrumb, StatCard, Table, FormsModule, LucideDownload],
  templateUrl: './alertas.html',
})
export class Alertas {
  private readonly alertasService = inject(AlertasService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly entidades = this.entidadesService.entidades;
  protected readonly categorias = CATEGORIAS_ALERTA;
  protected readonly severidades = SEVERIDADES_ALERTA;

  protected readonly columns: TableColumn<AlertaRow>[] = [
    { key: 'severidadVisual', header: 'Severidad' },
    { key: 'categoria', header: 'Categoría' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'detalle', header: 'Detalle' },
    { key: 'diasTranscurridos', header: 'Días', align: 'right' },
  ];

  private readonly rows = computed<readonly AlertaRow[]>(() =>
    this.alertasService.getAlertas().map((alerta) => ({ ...alerta, severidadVisual: { label: alerta.severidad, variant: SEVERIDAD_VARIANT[alerta.severidad] } })),
  );

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const alertas = this.rows();
    const criticas = alertas.filter((a) => a.severidad === 'Crítica').length;
    const altas = alertas.filter((a) => a.severidad === 'Alta').length;
    const entidadesAfectadas = new Set(alertas.map((a) => a.entidadId)).size;

    return [
      { label: 'Total de Alertas', value: `${alertas.length}`, subtitle: `${this.categorias.length} categorías` },
      { label: 'Críticas', value: `${criticas}`, subtitle: 'Requieren atención inmediata' },
      { label: 'Altas', value: `${altas}`, subtitle: 'Próximas a agravarse' },
      { label: 'Entidades Afectadas', value: `${entidadesAfectadas}`, subtitle: 'Con al menos una alerta' },
    ];
  });

  protected searchTerm = '';
  protected filterCategoria = '';
  protected filterSeveridad = '';
  protected filterEntidadId = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedCategoria = signal('');
  private readonly appliedSeveridad = signal('');
  private readonly appliedEntidadId = signal('');

  protected readonly filteredAlertas = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const categoria = this.appliedCategoria();
    const severidad = this.appliedSeveridad();
    const entidadId = this.appliedEntidadId();

    return this.rows().filter((alerta) => {
      if (categoria && alerta.categoria !== categoria) return false;
      if (severidad && alerta.severidad !== severidad) return false;
      if (entidadId && alerta.entidadId !== entidadId) return false;
      if (term && !`${alerta.entidad} ${alerta.detalle}`.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  protected buscar(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedCategoria.set(this.filterCategoria);
    this.appliedSeveridad.set(this.filterSeveridad);
    this.appliedEntidadId.set(this.filterEntidadId);
  }

  protected verAlerta(alerta: AlertaRow): void {
    this.router.navigate(alerta.ruta as string[]);
  }

  protected exportar(): void {
    const alertas = this.filteredAlertas();
    const encabezado = ['Severidad', 'Categoría', 'Entidad', 'Detalle', 'Días', 'Fecha Referencia'];
    const filas = alertas.map((a) => [a.severidad, a.categoria, a.entidad, a.detalle, String(a.diasTranscurridos), a.fechaReferencia]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${alertas.length} alertas exportadas.`);
  }
}
