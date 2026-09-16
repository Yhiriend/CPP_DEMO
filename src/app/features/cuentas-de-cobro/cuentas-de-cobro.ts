import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideBan,
  LucideCalendarCheck,
  LucideDownload,
  LucideEye,
  LucidePlus,
} from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { Table } from '../../shared/ui/table/table';
import { TableBadge, TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { BeneficiariosService } from '../pensionados/beneficiarios.service';
import { EntidadesService } from '../entidades/entidades.service';
import { LiquidacionesService } from '../liquidaciones/liquidaciones.service';
import { CuentasDeCobroService } from './cuentas-de-cobro.service';
import {
  CuentaCobro,
  ESTADOS_CUENTA_COBRO_GENERABLES,
  EstadoCuentaCobro,
  SoporteRecepcion,
  TipoCuentaCobro,
} from './models/cuenta-cobro.model';

interface CuentaCobroRow extends CuentaCobro {
  readonly estadoVisual: TableBadge;
  readonly interesesLabel: string;
  readonly valorTotalLabel: string;
  readonly pensionadosLabel: string;
  readonly fechaRecepcionLabel: string;
  readonly fechaVencimientoLabel: string;
}

const ESTADOS_FILTRO: readonly EstadoCuentaCobro[] = ['Borrador', 'Pendiente', 'Radicada', 'Vencida', 'Anulada'];

@Component({
  selector: 'app-cuentas-de-cobro',
  imports: [Breadcrumb, Table, FormsModule, Modal, LucideDownload, LucidePlus, LucideEye, LucideCalendarCheck, LucideBan],
  templateUrl: './cuentas-de-cobro.html',
})
export class CuentasDeCobro {
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly liquidacionesService = inject(LiquidacionesService);
  private readonly beneficiariosService = inject(BeneficiariosService);
  private readonly toastService = inject(ToastService);

  protected readonly entidades = this.entidadesService.entidades;
  protected readonly estadosFiltro = ESTADOS_FILTRO;

  protected readonly columns: TableColumn<CuentaCobroRow>[] = [
    { key: 'idCuenta', header: 'ID Cuenta' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'pensionadosLabel', header: 'Pensionados' },
    { key: 'capitalLabel', header: 'Capital', align: 'right' },
    { key: 'interesesLabel', header: 'Intereses', align: 'right' },
    { key: 'valorTotalLabel', header: 'Valor Total', align: 'right' },
    { key: 'fechaRecepcionLabel', header: 'Fecha Recepción' },
    { key: 'fechaVencimientoLabel', header: 'Fecha Vencimiento' },
    { key: 'estadoVisual', header: 'Estado' },
  ];

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterEstado = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedEstado = signal('');

  private readonly rows = computed<readonly CuentaCobroRow[]>(() =>
    this.cuentasDeCobroService.cuentasCobro().map((cuenta) => this.toRow(cuenta)),
  );

  protected readonly filteredCuentas = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const estado = this.appliedEstado();

    return this.rows().filter((cuenta) => {
      if (entidadId && cuenta.entidadId !== entidadId) return false;
      if (estado && cuenta.estadoVisual.label !== estado) return false;
      if (term) {
        const haystack = `${cuenta.idCuenta} ${cuenta.entidad} ${cuenta.pensionadosLabel}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  protected buscar(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedEstado.set(this.filterEstado);
  }

  protected readonly totalCapitalLabel = computed(() =>
    this.formatCurrency(this.filteredCuentas().reduce((sum, c) => sum + c.capital, 0)),
  );
  protected readonly totalInteresesLabel = computed(() =>
    this.formatCurrency(this.filteredCuentas().reduce((sum, c) => sum + this.cuentasDeCobroService.calcularInteresesCuenta(c).interes, 0)),
  );
  protected readonly resumenEstados = computed(() => {
    const cuentas = this.filteredCuentas();
    const conteo = (estado: EstadoCuentaCobro) => cuentas.filter((c) => c.estadoVisual.label === estado).length;
    return `${conteo('Radicada')} radicada · ${conteo('Pendiente')} pendiente · ${conteo('Vencida')} vencida · ${conteo('Borrador')} borrador · ${conteo('Anulada')} anulada`;
  });

  // --- Exportar ---

  protected exportar(): void {
    const cuentas = this.filteredCuentas();
    const encabezado = ['ID Cuenta', 'Tipo', 'Entidad', 'Pensionados', 'Capital', 'Intereses', 'Valor Total', 'Fecha Recepción', 'Fecha Vencimiento', 'Estado'];
    const filas = cuentas.map((c) => [
      c.idCuenta,
      c.tipo,
      c.entidad,
      c.pensionadosLabel,
      String(c.capital),
      String(this.cuentasDeCobroService.calcularInteresesCuenta(c).interes),
      String(c.capital + this.cuentasDeCobroService.calcularInteresesCuenta(c).interes),
      c.fechaRecepcionLabel,
      c.fechaVencimientoLabel,
      c.estadoVisual.label,
    ]);
    const csv = [encabezado, ...filas].map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cuentas-de-cobro-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${cuentas.length} cuentas de cobro exportadas.`);
  }

  // --- Generar Cuenta (HU-010) ---

  protected readonly showGenerarModal = signal(false);
  protected readonly estadosGenerables = ESTADOS_CUENTA_COBRO_GENERABLES;
  protected formTipo: TipoCuentaCobro = 'Individual';
  protected formEntidadId = '';
  protected formLiquidacionId = '';
  protected formLiquidacionIdsConsolidada = new Set<string>();
  protected formEstadoInicial: EstadoCuentaCobro = 'Pendiente';
  protected formError = '';

  protected readonly liquidacionesDisponibles = computed(() => {
    const facturadas = this.cuentasDeCobroService.liquidacionesFacturadas();
    return this.liquidacionesService.liquidaciones().filter((l) => !facturadas.has(l.idLiquidacion));
  });

  protected readonly liquidacionesEntidadSeleccionada = computed(() =>
    this.liquidacionesDisponibles().filter((l) => l.entidadId === this.formEntidadId),
  );

  protected openGenerarModal(): void {
    this.formTipo = 'Individual';
    this.formEntidadId = '';
    this.formLiquidacionId = '';
    this.formLiquidacionIdsConsolidada = new Set<string>();
    this.formEstadoInicial = 'Pendiente';
    this.formError = '';
    this.showGenerarModal.set(true);
  }

  protected toggleLiquidacionConsolidada(idLiquidacion: string, checked: boolean): void {
    const seleccion = new Set(this.formLiquidacionIdsConsolidada);
    if (checked) seleccion.add(idLiquidacion);
    else seleccion.delete(idLiquidacion);
    this.formLiquidacionIdsConsolidada = seleccion;
  }

  protected get previewCapital(): number {
    if (this.formTipo === 'Individual') {
      return this.liquidacionesDisponibles().find((l) => l.idLiquidacion === this.formLiquidacionId)?.capital ?? 0;
    }
    return this.liquidacionesEntidadSeleccionada()
      .filter((l) => this.formLiquidacionIdsConsolidada.has(l.idLiquidacion))
      .reduce((sum, l) => sum + l.capital, 0);
  }

  protected get previewCapitalLabel(): string {
    return this.formatCurrency(this.previewCapital);
  }

  protected get previewValorEnLetras(): string {
    return this.cuentasDeCobroService.valorEnLetras(this.previewCapital);
  }

  protected submitGenerar(): void {
    try {
      if (this.formTipo === 'Individual') {
        if (!this.formLiquidacionId) {
          this.formError = 'Seleccione una liquidación.';
          return;
        }
        const nueva = this.cuentasDeCobroService.generarIndividual({
          liquidacionId: this.formLiquidacionId,
          estadoInicial: this.formEstadoInicial,
        });
        this.toastService.show(`Cuenta de cobro ${nueva.idCuenta} generada correctamente.`);
      } else {
        if (!this.formEntidadId || this.formLiquidacionIdsConsolidada.size === 0) {
          this.formError = 'Seleccione la entidad y al menos una liquidación.';
          return;
        }
        const nueva = this.cuentasDeCobroService.generarConsolidada({
          entidadId: this.formEntidadId,
          liquidacionIds: Array.from(this.formLiquidacionIdsConsolidada),
          estadoInicial: this.formEstadoInicial,
        });
        this.toastService.show(`Cuenta de cobro consolidada ${nueva.idCuenta} generada correctamente.`);
      }
      this.showGenerarModal.set(false);
    } catch (error) {
      this.formError = error instanceof Error ? error.message : 'No fue posible generar la cuenta de cobro.';
    }
  }

  // --- Registrar Fecha de Recepción (HU-011) ---

  protected readonly showRecepcionModal = signal(false);
  protected readonly recepcionCuenta = signal<CuentaCobroRow | null>(null);
  protected recepcionFecha = todayIso();
  protected recepcionSoporteNombre = '';
  protected recepcionError = '';

  protected openRecepcionModal(cuenta: CuentaCobroRow): void {
    this.recepcionCuenta.set(cuenta);
    this.recepcionFecha = cuenta.fechaRecepcion ?? todayIso();
    this.recepcionSoporteNombre = '';
    this.recepcionError = '';
    this.showRecepcionModal.set(true);
  }

  protected onSoporteSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      this.recepcionError = 'Solo se permiten archivos XLSX como soporte documental.';
      input.value = '';
      return;
    }
    this.recepcionSoporteNombre = archivo.name;
    this.recepcionError = '';
  }

  protected get previewVencimiento(): string {
    if (!this.recepcionFecha) return '—';
    const fecha = new Date(this.recepcionFecha);
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().slice(0, 10);
  }

  protected submitRecepcion(): void {
    const cuenta = this.recepcionCuenta();
    if (!cuenta) return;

    const soporte: SoporteRecepcion | null = this.recepcionSoporteNombre
      ? { nombreArchivo: this.recepcionSoporteNombre, fechaCargue: todayIso() }
      : null;

    try {
      this.cuentasDeCobroService.registrarRecepcion(cuenta.idCuenta, {
        fechaRecepcion: this.recepcionFecha,
        soporte,
      });
      this.toastService.show(`Fecha de recepción registrada para ${cuenta.idCuenta}.`);
      this.showRecepcionModal.set(false);
    } catch (error) {
      this.recepcionError = error instanceof Error ? error.message : 'No fue posible registrar la recepción.';
    }
  }

  // --- Anular ---

  protected anular(cuenta: CuentaCobroRow): void {
    this.cuentasDeCobroService.anular(cuenta.idCuenta);
    this.toastService.show(`Cuenta de cobro ${cuenta.idCuenta} anulada.`);
  }

  // --- Ver Cuenta (detalle) ---

  protected readonly showDetalleModal = signal(false);
  protected readonly detalleCuenta = signal<CuentaCobroRow | null>(null);

  protected verCuenta(cuenta: CuentaCobroRow): void {
    this.detalleCuenta.set(cuenta);
    this.showDetalleModal.set(true);
  }

  protected liquidacionesDe(cuenta: CuentaCobro) {
    const porId = new Map(this.liquidacionesService.liquidaciones().map((l) => [l.idLiquidacion, l] as const));
    return cuenta.liquidacionIds.map((id) => porId.get(id)).filter((l): l is NonNullable<typeof l> => !!l);
  }

  protected beneficiariosCount(pensionadoId: string): number {
    return this.beneficiariosService.getByPensionado(pensionadoId).length;
  }

  protected interesesDe(cuenta: CuentaCobro) {
    return this.cuentasDeCobroService.calcularInteresesCuenta(cuenta);
  }

  protected valorTotalDe(cuenta: CuentaCobro): number {
    return cuenta.capital + this.cuentasDeCobroService.calcularInteresesCuenta(cuenta).interes;
  }

  protected valorEnLetrasDe(cuenta: CuentaCobro): string {
    return this.cuentasDeCobroService.valorEnLetras(this.valorTotalDe(cuenta));
  }

  private toRow(cuenta: CuentaCobro): CuentaCobroRow {
    const { interes, interesLabel } = this.cuentasDeCobroService.calcularInteresesCuenta(cuenta);
    return {
      ...cuenta,
      estadoVisual: this.cuentasDeCobroService.estadoVisual(cuenta),
      interesesLabel: interesLabel,
      valorTotalLabel: this.formatCurrency(cuenta.capital + interes),
      pensionadosLabel: cuenta.pensionados.length === 1 ? cuenta.pensionados[0] : `${cuenta.pensionados.length} pensionados`,
      fechaRecepcionLabel: cuenta.fechaRecepcion ?? '—',
      fechaVencimientoLabel: cuenta.fechaVencimiento ?? '—',
    };
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
