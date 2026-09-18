import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { MoneyInputDirective } from '../../shared/ui/money-input/money-input.directive';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableBadge, TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { DesembolsoFonpet } from '../acuerdos/models/acuerdo.model';
import { EntidadesService } from '../entidades/entidades.service';
import { PagoRecibido } from '../pagos/models/pago.model';
import { IMPUTACION_TABS, ImputacionTabId } from './imputaciones-tabs';
import { ImputacionesService } from './imputaciones.service';
import { Imputacion, SaldoAFavor } from './models/imputacion.model';

interface PagoPendienteRow extends PagoRecibido {
  readonly montoDisponible: number;
  readonly montoDisponibleLabel: string;
  readonly obligacionLabel: string;
}

interface DesembolsoPendienteRow extends DesembolsoFonpet {
  readonly montoDisponible: number;
  readonly montoDisponibleLabel: string;
}

interface SaldoAFavorRow extends SaldoAFavor {
  readonly montoDisponible: number;
  readonly montoDisponibleLabel: string;
}

interface HistoricoRow extends Imputacion {
  readonly estadoVisual: TableBadge;
}

type PartidaPendiente =
  | { readonly kind: 'pago'; readonly data: PagoPendienteRow }
  | { readonly kind: 'desembolso'; readonly data: DesembolsoPendienteRow }
  | { readonly kind: 'saldo-a-favor'; readonly data: SaldoAFavorRow };

const VIGENTE_BADGE: TableBadge = { label: 'Vigente', variant: 'success' };
const REVERSADA_BADGE: TableBadge = { label: 'Reversada', variant: 'danger' };

@Component({
  selector: 'app-imputaciones',
  imports: [Breadcrumb, StatCard, Table, FormsModule, Modal, MoneyInputDirective, DecimalPipe, LucideDownload],
  templateUrl: './imputaciones.html',
})
export class Imputaciones {
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly tabs = IMPUTACION_TABS;
  protected readonly activeTabId = signal<ImputacionTabId>('pendientes');
  protected readonly entidades = this.entidadesService.entidades;

  protected selectTab(tabId: ImputacionTabId): void {
    this.activeTabId.set(tabId);
  }

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const pendientes = this.imputacionesService.pagosPendientesDeImputar();
    const totalPendiente = pendientes.reduce(
      (sum, p) => sum + this.imputacionesService.montoDisponibleDePago(p),
      0,
    );
    const desembolsosPendientes = this.imputacionesService.desembolsosPendientesDeImputar();
    const totalDesembolsosPendientes = desembolsosPendientes.reduce(
      (sum, d) => sum + this.imputacionesService.montoDisponibleDeDesembolso(d),
      0,
    );
    const saldosPendientes = this.imputacionesService.saldosAFavorPendientes();
    const totalSaldosPendientes = saldosPendientes.reduce(
      (sum, s) => sum + this.imputacionesService.montoDisponibleDeSaldoAFavor(s),
      0,
    );
    const historico = this.imputacionesService.imputaciones();
    const totalIntereses = historico.filter((i) => !i.reversada).reduce((sum, i) => sum + i.valorAplicadoIntereses, 0);
    const totalCapital = historico.filter((i) => !i.reversada).reduce((sum, i) => sum + i.valorAplicadoCapital, 0);

    return [
      {
        label: 'Pagos Pendientes de Imputar',
        value: this.formatCurrency(totalPendiente),
        subtitle: `${pendientes.length} pagos`,
      },
      {
        label: 'Desembolsos FONPET Pendientes',
        value: this.formatCurrency(totalDesembolsosPendientes),
        subtitle: `${desembolsosPendientes.length} desembolsos`,
      },
      {
        label: 'Saldos a Favor Disponibles',
        value: this.formatCurrency(totalSaldosPendientes),
        subtitle: `${saldosPendientes.length} saldos · CCAL-022`,
      },
      { label: 'Aplicado a Intereses', value: this.formatCurrency(totalIntereses), subtitle: 'CCAL-014' },
      { label: 'Aplicado a Capital', value: this.formatCurrency(totalCapital), subtitle: `CCAL-015 · ${historico.length} imputaciones` },
    ];
  });

  // --- Pagos Pendientes de Imputar ---

  protected readonly columnsPendientes: TableColumn<PagoPendienteRow>[] = [
    { key: 'idTransaccion', header: 'ID Transacción' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'obligacionLabel', header: 'Obligación' },
    { key: 'montoRecibidoLabel', header: 'Monto Recibido', align: 'right' },
    { key: 'montoDisponibleLabel', header: 'Disponible', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
  ];

  protected readonly pagosPendientes = computed<readonly PagoPendienteRow[]>(() =>
    this.imputacionesService.pagosPendientesDeImputar().map((pago) => ({
      ...pago,
      montoDisponible: this.imputacionesService.montoDisponibleDePago(pago),
      montoDisponibleLabel: this.formatCurrency(this.imputacionesService.montoDisponibleDePago(pago)),
      obligacionLabel: pago.cuentaCobroId ?? '— Sin identificar —',
    })),
  );

  // --- Desembolsos FONPET Pendientes de Imputar (HU-022) ---

  protected readonly columnsDesembolsos: TableColumn<DesembolsoPendienteRow>[] = [
    { key: 'idDesembolso', header: 'ID Desembolso' },
    { key: 'acuerdoId', header: 'Acuerdo' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'valorLabel', header: 'Valor Desembolsado', align: 'right' },
    { key: 'montoDisponibleLabel', header: 'Disponible', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
  ];

  protected readonly desembolsosPendientes = computed<readonly DesembolsoPendienteRow[]>(() =>
    this.imputacionesService.desembolsosPendientesDeImputar().map((desembolso) => ({
      ...desembolso,
      montoDisponible: this.imputacionesService.montoDisponibleDeDesembolso(desembolso),
      montoDisponibleLabel: this.formatCurrency(this.imputacionesService.montoDisponibleDeDesembolso(desembolso)),
    })),
  );

  // --- Saldos a Favor Disponibles (gestión de excepciones de recaudo — CCAL-022) ---

  protected readonly columnsSaldosAFavor: TableColumn<SaldoAFavorRow>[] = [
    { key: 'id', header: 'ID Saldo' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'origenImputacionId', header: 'Origen' },
    { key: 'valorLabel', header: 'Valor Registrado', align: 'right' },
    { key: 'montoDisponibleLabel', header: 'Disponible', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
  ];

  protected readonly saldosAFavorPendientes = computed<readonly SaldoAFavorRow[]>(() =>
    this.imputacionesService.saldosAFavorPendientes().map((saldo) => ({
      ...saldo,
      montoDisponible: this.imputacionesService.montoDisponibleDeSaldoAFavor(saldo),
      montoDisponibleLabel: this.formatCurrency(this.imputacionesService.montoDisponibleDeSaldoAFavor(saldo)),
    })),
  );

  // --- Imputar modal (HU-016/017/022 + saldo a favor) ---

  protected readonly showImputarModal = signal(false);
  protected readonly imputarPartida = signal<PartidaPendiente | null>(null);
  protected formCuentaCobroId = '';
  protected formValorAImputar: number | null = null;
  protected formRegistrarExcedente = true;
  protected formError = '';

  protected readonly cuentaBloqueada = computed(() => {
    const partida = this.imputarPartida();
    return partida?.kind === 'pago' && !!partida.data.cuentaCobroId;
  });

  protected readonly permiteObligacionMasAntigua = computed(() => this.imputarPartida()?.kind === 'pago');

  protected readonly cuentasDisponibles = computed(() => {
    const partida = this.imputarPartida();
    if (!partida) return [];
    if (partida.kind === 'pago') return this.imputacionesService.cuentasPendientesDeEntidad(partida.data.entidadId);
    if (partida.kind === 'desembolso') return this.imputacionesService.cuentasElegiblesDeDesembolso(partida.data);
    return this.imputacionesService.cuentasElegiblesDeSaldoAFavor(partida.data);
  });

  protected abrirImputarPago(pago: PagoPendienteRow): void {
    this.imputarPartida.set({ kind: 'pago', data: pago });
    this.formCuentaCobroId = pago.cuentaCobroId ?? '';
    this.formValorAImputar = pago.montoDisponible;
    this.formRegistrarExcedente = true;
    this.formError = '';
    this.showImputarModal.set(true);
  }

  protected abrirImputarDesembolso(desembolso: DesembolsoPendienteRow): void {
    this.imputarPartida.set({ kind: 'desembolso', data: desembolso });
    this.formCuentaCobroId = '';
    this.formValorAImputar = desembolso.montoDisponible;
    this.formRegistrarExcedente = true;
    this.formError = '';
    this.showImputarModal.set(true);
  }

  protected abrirImputarSaldoAFavor(saldo: SaldoAFavorRow): void {
    this.imputarPartida.set({ kind: 'saldo-a-favor', data: saldo });
    this.formCuentaCobroId = '';
    this.formValorAImputar = saldo.montoDisponible;
    this.formRegistrarExcedente = false;
    this.formError = '';
    this.showImputarModal.set(true);
  }

  protected usarObligacionMasAntigua(): void {
    const partida = this.imputarPartida();
    if (!partida || partida.kind !== 'pago') return;
    const masAntigua = this.imputacionesService.obligacionMasAntigua(partida.data.entidadId);
    if (!masAntigua) {
      this.formError = 'No hay obligaciones pendientes para esta entidad.';
      return;
    }
    this.formCuentaCobroId = masAntigua.idCuenta;
    this.formError = '';
  }

  protected get partidaId(): string {
    const partida = this.imputarPartida();
    if (!partida) return '';
    if (partida.kind === 'pago') return partida.data.idTransaccion;
    if (partida.kind === 'desembolso') return partida.data.idDesembolso;
    return partida.data.id;
  }

  protected get partidaEntidad(): string {
    return this.imputarPartida()?.data.entidad ?? '';
  }

  protected get partidaMontoDisponibleLabel(): string {
    return this.imputarPartida()?.data.montoDisponibleLabel ?? '';
  }

  protected get partidaMontoDisponible(): number {
    return this.imputarPartida()?.data.montoDisponible ?? 0;
  }

  protected get partidaAyudaCuenta(): string {
    const kind = this.imputarPartida()?.kind;
    if (kind === 'desembolso') return 'Solo se listan las obligaciones cubiertas por el acuerdo FONPET.';
    if (kind === 'saldo-a-favor') return 'Solo se listan obligaciones pendientes de la misma entidad que originó el saldo a favor.';
    return 'CCAL-019 — si no se indica, se aplica a la obligación más antigua.';
  }

  /** Getter (no `computed`) porque formCuentaCobroId/formValorAImputar son campos planos de ngModel, no signals. */
  protected get previsualizacion() {
    if (!this.formCuentaCobroId || !this.formValorAImputar) return null;
    return this.imputacionesService.previsualizar(this.formCuentaCobroId, this.formValorAImputar);
  }

  protected submitImputar(): void {
    const partida = this.imputarPartida();
    if (!partida) return;
    if (!this.formCuentaCobroId) {
      this.formError = 'Seleccione la obligación a la que se aplicará el recurso.';
      return;
    }
    if (!this.formValorAImputar || this.formValorAImputar <= 0) {
      this.formError = 'Ingrese un valor a imputar mayor a cero.';
      return;
    }

    try {
      const nueva =
        partida.kind === 'pago'
          ? this.imputacionesService.imputar({
              pagoId: partida.data.idTransaccion,
              cuentaCobroId: this.formCuentaCobroId,
              valorAImputar: this.formValorAImputar,
              registrarExcedenteComoSaldoAFavor: this.formRegistrarExcedente,
            })
          : partida.kind === 'desembolso'
            ? this.imputacionesService.imputarDesembolso({
                desembolsoId: partida.data.idDesembolso,
                cuentaCobroId: this.formCuentaCobroId,
                valorAImputar: this.formValorAImputar,
                registrarExcedenteComoSaldoAFavor: this.formRegistrarExcedente,
              })
            : this.imputacionesService.aplicarSaldoAFavor({
                saldoAFavorId: partida.data.id,
                cuentaCobroId: this.formCuentaCobroId,
                valorAImputar: this.formValorAImputar,
              });
      this.toastService.show(`Imputación ${nueva.idImputacion} registrada correctamente.`);
      this.showImputarModal.set(false);
    } catch (error) {
      this.formError = error instanceof Error ? error.message : 'No fue posible registrar la imputación.';
    }
  }

  // --- Histórico de Imputaciones (HU-018) ---

  protected readonly columnsHistorico: TableColumn<HistoricoRow>[] = [
    { key: 'idImputacion', header: 'ID Imputación' },
    { key: 'origen', header: 'Origen' },
    { key: 'cuentaCobroId', header: 'Cuenta de Cobro' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'valorImputadoLabel', header: 'Valor Imputado', align: 'right' },
    { key: 'valorAplicadoInteresesLabel', header: 'A Intereses', align: 'right' },
    { key: 'valorAplicadoCapitalLabel', header: 'A Capital', align: 'right' },
    { key: 'saldoTotalObligacionLabel', header: 'Saldo Resultante', align: 'right' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'estadoVisual', header: 'Estado' },
  ];

  protected searchTerm = '';
  protected filterEntidadId = '';
  protected filterDesde = '';
  protected filterHasta = '';

  private readonly appliedSearchTerm = signal('');
  private readonly appliedEntidadId = signal('');
  private readonly appliedDesde = signal('');
  private readonly appliedHasta = signal('');

  protected readonly filteredHistorico = computed<readonly HistoricoRow[]>(() => {
    const term = this.appliedSearchTerm().trim().toLowerCase();
    const entidadId = this.appliedEntidadId();
    const desde = this.appliedDesde();
    const hasta = this.appliedHasta();

    return this.imputacionesService
      .imputaciones()
      .filter((imputacion) => {
        if (entidadId && imputacion.entidadId !== entidadId) return false;
        if (desde && imputacion.fecha < desde) return false;
        if (hasta && imputacion.fecha > hasta) return false;
        if (term) {
          const referencia = imputacion.pagoId ?? imputacion.desembolsoId ?? imputacion.saldoAFavorId ?? '';
          const haystack =
            `${imputacion.idImputacion} ${referencia} ${imputacion.cuentaCobroId} ${imputacion.entidad} ${imputacion.pensionados.join(' ')}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      })
      .map((imputacion) => ({ ...imputacion, estadoVisual: imputacion.reversada ? REVERSADA_BADGE : VIGENTE_BADGE }));
  });

  protected buscarHistorico(): void {
    this.appliedSearchTerm.set(this.searchTerm);
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedDesde.set(this.filterDesde);
    this.appliedHasta.set(this.filterHasta);
  }

  protected exportarHistorico(): void {
    const imputaciones = this.filteredHistorico();
    const encabezado = [
      'ID Imputación',
      'Origen',
      'Referencia',
      'Cuenta',
      'Entidad',
      'Pensionados',
      'Valor Imputado',
      'A Intereses',
      'A Capital',
      'Saldo Resultante',
      'Regla',
      'Fecha',
      'Registrado Por',
      'Estado',
    ];
    const filas = imputaciones.map((i) => [
      i.idImputacion,
      i.origen,
      i.pagoId ?? i.desembolsoId ?? i.saldoAFavorId ?? '',
      i.cuentaCobroId,
      i.entidad,
      i.pensionados.join('; '),
      String(i.valorImputado),
      String(i.valorAplicadoIntereses),
      String(i.valorAplicadoCapital),
      String(i.saldoTotalObligacion),
      i.reglaAplicada,
      i.fecha,
      i.registradoPor,
      i.estadoVisual.label,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `imputaciones-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${imputaciones.length} imputaciones exportadas.`);
  }

  // --- Ver Detalle histórico ---

  protected readonly showDetalleModal = signal(false);
  protected readonly detalleImputacion = signal<HistoricoRow | null>(null);

  protected verDetalle(imputacion: HistoricoRow): void {
    this.detalleImputacion.set(imputacion);
    this.showDetalleModal.set(true);
  }

  // --- Reversar (gestión de excepciones de recaudo) ---

  protected readonly showReversarModal = signal(false);
  protected readonly reversarObjetivo = signal<HistoricoRow | null>(null);
  protected reversarMotivo = '';
  protected reversarError = '';

  protected puedeReversar(imputacion: Imputacion): boolean {
    return this.imputacionesService.puedeReversar(imputacion).ok;
  }

  protected abrirReversar(imputacion: HistoricoRow): void {
    const validacion = this.imputacionesService.puedeReversar(imputacion);
    if (!validacion.ok) {
      this.toastService.show(validacion.motivo ?? 'No es posible reversar esta imputación.');
      return;
    }
    this.reversarObjetivo.set(imputacion);
    this.reversarMotivo = '';
    this.reversarError = '';
    this.showReversarModal.set(true);
  }

  protected submitReversar(): void {
    const imputacion = this.reversarObjetivo();
    if (!imputacion) return;
    try {
      this.imputacionesService.reversar(imputacion.idImputacion, this.reversarMotivo);
      this.toastService.show(`Imputación ${imputacion.idImputacion} reversada correctamente.`);
      this.showReversarModal.set(false);
    } catch (error) {
      this.reversarError = error instanceof Error ? error.message : 'No fue posible reversar la imputación.';
    }
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
  }
}
