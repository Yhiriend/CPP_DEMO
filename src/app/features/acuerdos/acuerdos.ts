import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { EntidadesService } from '../entidades/entidades.service';
import { ImputacionesService } from '../imputaciones/imputaciones.service';
import { AcuerdosService } from './acuerdos.service';
import {
  AcuerdoFonpet,
  AcuerdoFormValue,
  DesembolsoFormValue,
  ESTADOS_ACUERDO,
  EstadoAcuerdo,
  SoporteAcuerdo,
  TIPOS_DESEMBOLSO,
  TipoDesembolso,
} from './models/acuerdo.model';

interface AcuerdoRow extends AcuerdoFonpet {
  readonly valorDesembolsadoLabel: string;
  readonly saldoPorDesembolsarLabel: string;
}

@Component({
  selector: 'app-acuerdos',
  imports: [Breadcrumb, Table, FormsModule, Modal, LucideDownload, LucidePlus],
  templateUrl: './acuerdos.html',
})
export class Acuerdos {
  private readonly acuerdosService = inject(AcuerdosService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly toastService = inject(ToastService);

  protected readonly entidades = this.entidadesService.entidades;
  protected readonly estados = ESTADOS_ACUERDO;

  protected readonly columns: TableColumn<AcuerdoRow>[] = [
    { key: 'idAcuerdo', header: 'ID Acuerdo' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'valorAprobadoLabel', header: 'Valor Aprobado', align: 'right' },
    { key: 'valorDesembolsadoLabel', header: 'Desembolsado', align: 'right' },
    { key: 'saldoPorDesembolsarLabel', header: 'Saldo por Desembolsar', align: 'right' },
    { key: 'fechaAprobacion', header: 'Fecha Aprobación' },
    { key: 'estado', header: 'Estado' },
  ];

  private readonly rows = computed<readonly AcuerdoRow[]>(() =>
    this.acuerdosService.acuerdos().map((acuerdo) => ({
      ...acuerdo,
      valorDesembolsadoLabel: this.formatCurrency(this.acuerdosService.valorDesembolsado(acuerdo.idAcuerdo)),
      saldoPorDesembolsarLabel: this.formatCurrency(this.acuerdosService.saldoPorDesembolsar(acuerdo)),
    })),
  );

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterEstado = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedEstado = signal('');

  protected readonly filteredAcuerdos = computed(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const estado = this.appliedEstado();

    return this.rows().filter((acuerdo) => {
      if (entidadId && acuerdo.entidadId !== entidadId) return false;
      if (estado && acuerdo.estado.label !== estado) return false;
      if (term && !`${acuerdo.idAcuerdo} ${acuerdo.entidad}`.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  protected buscar(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedEstado.set(this.filterEstado);
  }

  // --- Exportar ---

  protected exportar(): void {
    const acuerdos = this.filteredAcuerdos();
    const encabezado = ['ID Acuerdo', 'Entidad', 'Valor Aprobado', 'Desembolsado', 'Saldo por Desembolsar', 'Fecha Aprobación', 'Estado'];
    const filas = acuerdos.map((a) => [
      a.idAcuerdo,
      a.entidad,
      String(a.valorAprobado),
      String(this.acuerdosService.valorDesembolsado(a.idAcuerdo)),
      String(this.acuerdosService.saldoPorDesembolsar(a)),
      a.fechaAprobacion,
      a.estado.label,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acuerdos-fonpet-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${acuerdos.length} acuerdos exportados.`);
  }

  // --- Registrar Acuerdo (HU-019) ---

  protected readonly showFormModal = signal(false);
  protected formEntidadId = '';
  protected formCuentaCobroIds = new Set<string>();
  protected formValorAprobado: number | null = null;
  protected formFechaAprobacion = todayIso();
  protected formSoporteNombre = '';
  protected formError = '';

  /** Getter (no `computed`) porque formEntidadId es un campo plano de ngModel, no un signal. */
  protected get cuentasDeLaEntidad() {
    return this.cuentasDeCobroService
      .cuentasCobro()
      .filter((c) => c.entidadId === this.formEntidadId && c.estado.label !== 'Anulada');
  }

  protected openFormModal(): void {
    this.formEntidadId = '';
    this.formCuentaCobroIds = new Set<string>();
    this.formValorAprobado = null;
    this.formFechaAprobacion = todayIso();
    this.formSoporteNombre = '';
    this.formError = '';
    this.showFormModal.set(true);
  }

  protected toggleCuenta(idCuenta: string, checked: boolean): void {
    const seleccion = new Set(this.formCuentaCobroIds);
    if (checked) seleccion.add(idCuenta);
    else seleccion.delete(idCuenta);
    this.formCuentaCobroIds = seleccion;
  }

  protected onSoporteSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      this.formError = 'Solo se permiten archivos XLSX como soporte documental.';
      input.value = '';
      return;
    }
    this.formSoporteNombre = archivo.name;
    this.formError = '';
  }

  protected submitForm(): void {
    if (!this.formEntidadId || !this.formValorAprobado || this.formValorAprobado <= 0 || !this.formFechaAprobacion) {
      this.formError = 'Complete todos los campos obligatorios.';
      return;
    }

    const soporte: SoporteAcuerdo | null = this.formSoporteNombre
      ? { nombreArchivo: this.formSoporteNombre, fechaCargue: todayIso() }
      : null;

    const value: AcuerdoFormValue = {
      entidadId: this.formEntidadId,
      cuentaCobroIds: Array.from(this.formCuentaCobroIds),
      valorAprobado: this.formValorAprobado,
      fechaAprobacion: this.formFechaAprobacion,
      soporte,
    };

    const nuevo = this.acuerdosService.registrarAcuerdo(value);
    this.toastService.show(`Acuerdo ${nuevo.idAcuerdo} registrado correctamente.`);
    this.showFormModal.set(false);
  }

  // --- Ver Seguimiento (detalle: desembolsos, histórico de estados) ---

  protected readonly showDetalleModal = signal(false);
  protected readonly detalleAcuerdo = signal<AcuerdoRow | null>(null);

  protected verSeguimiento(acuerdo: AcuerdoRow): void {
    this.detalleAcuerdo.set(acuerdo);
    this.showDetalleModal.set(true);
  }

  protected desembolsosDe(acuerdoId: string) {
    return this.acuerdosService.desembolsosDe(acuerdoId);
  }

  protected estadoDesembolso(desembolsoId: string) {
    const desembolso = this.acuerdosService.getDesembolsoById(desembolsoId);
    return desembolso ? this.imputacionesService.estadoDeDesembolso(desembolso) : null;
  }

  protected cambiarEstado(acuerdo: AcuerdoFonpet, estado: EstadoAcuerdo): void {
    this.acuerdosService.cambiarEstado(acuerdo.idAcuerdo, estado);
    this.toastService.show(`Acuerdo ${acuerdo.idAcuerdo} marcado como "${estado}".`);
    const actualizado = this.acuerdosService.getById(acuerdo.idAcuerdo);
    if (actualizado) {
      this.detalleAcuerdo.set({
        ...actualizado,
        valorDesembolsadoLabel: this.formatCurrency(this.acuerdosService.valorDesembolsado(actualizado.idAcuerdo)),
        saldoPorDesembolsarLabel: this.formatCurrency(this.acuerdosService.saldoPorDesembolsar(actualizado)),
      });
    }
  }

  // --- Registrar Desembolso (HU-021) ---

  protected readonly showDesembolsoModal = signal(false);
  protected readonly tiposDesembolso = TIPOS_DESEMBOLSO;
  protected desembolsoTipo: TipoDesembolso = 'Parcial';
  protected desembolsoValor: number | null = null;
  protected desembolsoFecha = todayIso();
  protected desembolsoSoporteNombre = '';
  protected desembolsoError = '';

  protected openDesembolsoModal(): void {
    this.desembolsoTipo = 'Parcial';
    this.desembolsoValor = null;
    this.desembolsoFecha = todayIso();
    this.desembolsoSoporteNombre = '';
    this.desembolsoError = '';
    this.showDesembolsoModal.set(true);
  }

  protected onDesembolsoSoporteSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      this.desembolsoError = 'Solo se permiten archivos XLSX como soporte documental.';
      input.value = '';
      return;
    }
    this.desembolsoSoporteNombre = archivo.name;
    this.desembolsoError = '';
  }

  protected submitDesembolso(): void {
    const acuerdo = this.detalleAcuerdo();
    if (!acuerdo) return;
    if (!this.desembolsoValor || this.desembolsoValor <= 0) {
      this.desembolsoError = 'Ingrese un valor de desembolso mayor a cero.';
      return;
    }

    const soporte: SoporteAcuerdo | null = this.desembolsoSoporteNombre
      ? { nombreArchivo: this.desembolsoSoporteNombre, fechaCargue: todayIso() }
      : null;

    const value: DesembolsoFormValue = {
      acuerdoId: acuerdo.idAcuerdo,
      tipo: this.desembolsoTipo,
      valor: this.desembolsoValor,
      fecha: this.desembolsoFecha,
      soporte,
    };

    try {
      const nuevo = this.acuerdosService.registrarDesembolso(value);
      this.toastService.show(`Desembolso ${nuevo.idDesembolso} registrado correctamente.`);
      this.showDesembolsoModal.set(false);
      const actualizado = this.acuerdosService.getById(acuerdo.idAcuerdo);
      if (actualizado) {
        this.detalleAcuerdo.set({
          ...actualizado,
          valorDesembolsadoLabel: this.formatCurrency(this.acuerdosService.valorDesembolsado(actualizado.idAcuerdo)),
          saldoPorDesembolsarLabel: this.formatCurrency(this.acuerdosService.saldoPorDesembolsar(actualizado)),
        });
      }
    } catch (error) {
      this.desembolsoError = error instanceof Error ? error.message : 'No fue posible registrar el desembolso.';
    }
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
