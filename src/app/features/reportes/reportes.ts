import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucideFileText } from '@lucide/angular';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { EventoAuditoria, MODULOS_AUDITORIA } from '../../core/auditoria/models/evento-auditoria.model';
import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { EntidadesService } from '../entidades/entidades.service';
import { REPORTES_TABS, ReportesTabId } from './reportes-tabs';
import { ReportesService } from './reportes.service';
import { FiltrosReporte, ReporteGenerado, TipoReporte, TIPOS_REPORTE } from './models/reporte.model';

@Component({
  selector: 'app-reportes',
  imports: [Breadcrumb, Table, FormsModule, LucideDownload, LucideFileText],
  templateUrl: './reportes.html',
})
export class Reportes {
  private readonly reportesService = inject(ReportesService);
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly tabs = REPORTES_TABS;
  protected readonly activeTabId = signal<ReportesTabId>('generar');
  protected readonly entidades = this.entidadesService.entidades;
  protected readonly tiposReporte = TIPOS_REPORTE;

  protected selectTab(tabId: ReportesTabId): void {
    this.activeTabId.set(tabId);
  }

  // --- Generar Reporte ---

  protected formTipo: TipoReporte = 'Mensual';
  protected formEntidadId = '';
  protected formFechaDesde = '2026-01-01';
  protected formFechaHasta = todayIso();

  protected readonly reporteActual = signal<ReporteGenerado | null>(null);
  protected readonly historico = computed(() => this.reportesService.historico());

  protected readonly columnsHistorico: TableColumn<ReporteGenerado>[] = [
    { key: 'id', header: 'ID Reporte' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'fechaGeneracion', header: 'Fecha Generación' },
    { key: 'generadoPor', header: 'Generado Por' },
  ];

  protected generarReporte(): void {
    if (this.formFechaDesde > this.formFechaHasta) {
      this.toastService.show('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      return;
    }

    const filtros: FiltrosReporte = {
      tipo: this.formTipo,
      fechaDesde: this.formFechaDesde,
      fechaHasta: this.formFechaHasta,
      entidadId: this.formEntidadId || null,
    };

    const reporte = this.reportesService.generar(filtros);
    this.reporteActual.set(reporte);
    this.toastService.show(`Reporte ${reporte.id} generado correctamente.`);
  }

  protected verReporte(reporte: ReporteGenerado): void {
    this.reporteActual.set(reporte);
  }

  protected exportarReporte(): void {
    const reporte = this.reporteActual();
    if (!reporte) return;

    const lineas: string[] = [`Reporte ${reporte.tipo} — ${reporte.entidad}`, `Generado: ${reporte.timestamp}`, ''];
    lineas.push('Indicador,Valor');
    for (const indicador of reporte.indicadores) {
      lineas.push(`"${indicador.etiqueta}","${indicador.valor}"`);
    }
    for (const tabla of reporte.tablas) {
      lineas.push('', tabla.titulo, tabla.columnas.join(','));
      for (const fila of tabla.filas) {
        lineas.push(tabla.columnas.map((col) => `"${String(fila[col] ?? '').replace(/"/g, '""')}"`).join(','));
      }
    }

    const blob = new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reporte.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`Reporte ${reporte.id} exportado.`);
  }

  // --- Auditoría y Trazabilidad (HU-032) ---

  protected readonly modulosAuditoria = MODULOS_AUDITORIA;

  protected readonly columnsAuditoria: TableColumn<EventoAuditoria>[] = [
    { key: 'timestamp', header: 'Fecha y Hora' },
    { key: 'usuario', header: 'Usuario' },
    { key: 'modulo', header: 'Módulo' },
    { key: 'accion', header: 'Acción' },
    { key: 'entidadAfectada', header: 'Entidad Afectada' },
    { key: 'detalle', header: 'Detalle' },
  ];

  protected filtroModulo = '';
  protected filtroDesde = '';
  protected filtroHasta = '';
  protected filtroTexto = '';

  private readonly appliedModulo = signal('');
  private readonly appliedDesde = signal('');
  private readonly appliedHasta = signal('');
  private readonly appliedTexto = signal('');

  protected buscarAuditoria(): void {
    this.appliedModulo.set(this.filtroModulo);
    this.appliedDesde.set(this.filtroDesde);
    this.appliedHasta.set(this.filtroHasta);
    this.appliedTexto.set(this.filtroTexto);
  }

  protected readonly eventosFiltrados = computed(() => {
    const modulo = this.appliedModulo();
    const desde = this.appliedDesde();
    const hasta = this.appliedHasta();
    const texto = this.appliedTexto().trim().toLowerCase();

    return this.auditoriaService.eventos().filter((evento) => {
      if (modulo && evento.modulo !== modulo) return false;
      if (desde && evento.fecha < desde) return false;
      if (hasta && evento.fecha > hasta) return false;
      if (texto) {
        const haystack = `${evento.usuario} ${evento.accion} ${evento.entidadAfectada} ${evento.detalle}`.toLowerCase();
        if (!haystack.includes(texto)) return false;
      }
      return true;
    });
  });

  protected exportarAuditoria(): void {
    const eventos = this.eventosFiltrados();
    const encabezado = ['Fecha y Hora', 'Usuario', 'Módulo', 'Acción', 'Entidad Afectada', 'Detalle'];
    const filas = eventos.map((e) => [e.timestamp, e.usuario, e.modulo, e.accion, e.entidadAfectada, e.detalle]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${eventos.length} eventos exportados.`);
  }
}
