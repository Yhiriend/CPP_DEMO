import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDownload, LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Modal } from '../../shared/ui/modal/modal';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { todayIso } from '../../shared/utils/date';
import { EntidadesService } from '../entidades/entidades.service';
import { JuridicaService } from './juridica.service';
import { CasoJuridico, ESTADOS_TERMINALES_CASO, EstadoCasoJuridico, FLUJO_CASO_JURIDICO, Objecion } from './models/caso-juridico.model';

@Component({
  selector: 'app-juridica',
  imports: [Breadcrumb, StatCard, Table, FormsModule, Modal, LucideDownload, LucidePlus],
  templateUrl: './juridica.html',
})
export class JuridicaPage {
  private readonly juridicaService = inject(JuridicaService);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  protected readonly entidades = this.entidadesService.entidades;
  protected readonly flujo = FLUJO_CASO_JURIDICO;
  protected readonly estadosFiltro: readonly EstadoCasoJuridico[] = [
    ...FLUJO_CASO_JURIDICO,
    'Objeción en Trámite',
    'Objeción Aceptada',
    'Pagado',
    'Archivado',
  ];

  protected readonly columns: TableColumn<CasoJuridico>[] = [
    { key: 'id', header: 'ID' },
    { key: 'entidad', header: 'Entidad' },
    { key: 'valorLabel', header: 'Valor', align: 'right' },
    { key: 'fechaVencimientoCuenta', header: 'Venció el' },
    { key: 'fechaRadicacion', header: 'Radicado el' },
    { key: 'estado', header: 'Estado' },
  ];

  protected readonly kpis = computed<readonly StatCardData[]>(() => {
    const casos = this.juridicaService.casos();
    const activos = casos.filter((c) => !ESTADOS_TERMINALES_CASO.includes(c.estado.label as EstadoCasoJuridico));
    const enCoactivo = casos.filter((c) => c.estado.label === 'Proceso de Cobro Coactivo').length;
    const objecionesPendientes = casos.reduce(
      (sum, c) => sum + c.objeciones.filter((o) => o.estado === 'Pendiente').length,
      0,
    );

    return [
      { label: 'Casos Activos', value: `${activos.length}`, subtitle: `${casos.length} en total` },
      { label: 'En Cobro Coactivo', value: `${enCoactivo}` },
      { label: 'Objeciones Pendientes', value: `${objecionesPendientes}` },
      { label: 'Cuentas Elegibles para Radicar', value: `${this.juridicaService.cuentasElegibles().length}` },
    ];
  });

  protected filterEntidadId = '';
  protected filterEstado = '';

  private readonly appliedEntidadId = signal('');
  private readonly appliedEstado = signal('');

  protected readonly filteredCasos = computed(() => {
    const entidadId = this.appliedEntidadId();
    const estado = this.appliedEstado();

    return this.juridicaService.casos().filter((c) => {
      if (entidadId && c.entidadId !== entidadId) return false;
      if (estado && c.estado.label !== estado) return false;
      return true;
    });
  });

  protected buscar(): void {
    this.appliedEntidadId.set(this.filterEntidadId);
    this.appliedEstado.set(this.filterEstado);
  }

  protected exportar(): void {
    const casos = this.filteredCasos();
    const encabezado = ['ID', 'Cuenta de Cobro', 'Entidad', 'Valor', 'Venció el', 'Radicado el', 'Estado'];
    const filas = casos.map((c) => [
      c.id,
      c.cuentaCobroId,
      c.entidad,
      String(c.valor),
      c.fechaVencimientoCuenta,
      c.fechaRadicacion,
      c.estado.label,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gestion-juridica-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toastService.show(`${casos.length} casos exportados.`);
  }

  // --- Radicar Caso ---

  protected readonly showRadicarModal = signal(false);
  protected readonly cuentasElegibles = computed(() => this.juridicaService.cuentasElegibles());
  protected formCuentaId = '';
  protected radicarError = '';

  protected openRadicarModal(): void {
    this.formCuentaId = '';
    this.radicarError = '';
    this.showRadicarModal.set(true);
  }

  protected submitRadicar(): void {
    if (!this.formCuentaId) {
      this.radicarError = 'Seleccione la cuenta de cobro vencida sobre la que se abrirá el caso.';
      return;
    }
    try {
      const nuevo = this.juridicaService.radicar({ cuentaCobroId: this.formCuentaId });
      this.toastService.show(`Caso ${nuevo.id} radicado correctamente.`);
      this.showRadicarModal.set(false);
    } catch (error) {
      this.radicarError = error instanceof Error ? error.message : 'No fue posible radicar el caso.';
    }
  }

  // --- Ver Caso (detalle) ---

  protected readonly showCasoModal = signal(false);
  protected readonly casoActivo = signal<CasoJuridico | null>(null);

  protected verCaso(caso: CasoJuridico): void {
    this.casoActivo.set(caso);
    this.showCasoModal.set(true);
  }

  protected siguienteEstado(caso: CasoJuridico): EstadoCasoJuridico | null {
    const indice = FLUJO_CASO_JURIDICO.indexOf(caso.estado.label as EstadoCasoJuridico);
    if (indice === -1 || indice === FLUJO_CASO_JURIDICO.length - 1) return null;
    return FLUJO_CASO_JURIDICO[indice + 1];
  }

  protected objecionPendiente(caso: CasoJuridico): Objecion | null {
    return caso.objeciones.find((o) => o.estado === 'Pendiente') ?? null;
  }

  protected esTerminal(caso: CasoJuridico): boolean {
    return ESTADOS_TERMINALES_CASO.includes(caso.estado.label as EstadoCasoJuridico);
  }

  protected estaCubierta(caso: CasoJuridico): boolean {
    return this.juridicaService.estaCubierta(caso);
  }

  private refrescarCaso(id: string): void {
    const actualizado = this.juridicaService.getById(id);
    if (actualizado) this.casoActivo.set(actualizado);
  }

  // --- Avanzar ---

  protected readonly showAvanzarModal = signal(false);
  protected avanzarDescripcion = '';
  protected avanzarError = '';

  protected openAvanzarModal(): void {
    this.avanzarDescripcion = '';
    this.avanzarError = '';
    this.showAvanzarModal.set(true);
  }

  protected submitAvanzar(): void {
    const caso = this.casoActivo();
    if (!caso) return;
    try {
      this.juridicaService.avanzar(caso.id, this.avanzarDescripcion);
      this.toastService.show(`Caso ${caso.id} avanzó de estado.`);
      this.showAvanzarModal.set(false);
      this.refrescarCaso(caso.id);
    } catch (error) {
      this.avanzarError = error instanceof Error ? error.message : 'No fue posible avanzar el caso.';
    }
  }

  // --- Registrar Objeción ---

  protected readonly showObjecionModal = signal(false);
  protected objecionMotivo = '';
  protected objecionRadicadaPor = '';
  protected objecionError = '';

  protected openObjecionModal(): void {
    this.objecionMotivo = '';
    this.objecionRadicadaPor = '';
    this.objecionError = '';
    this.showObjecionModal.set(true);
  }

  protected submitObjecion(): void {
    const caso = this.casoActivo();
    if (!caso) return;
    try {
      this.juridicaService.registrarObjecion(caso.id, { motivo: this.objecionMotivo, radicadaPor: this.objecionRadicadaPor });
      this.toastService.show(`Objeción registrada sobre el caso ${caso.id}.`);
      this.showObjecionModal.set(false);
      this.refrescarCaso(caso.id);
    } catch (error) {
      this.objecionError = error instanceof Error ? error.message : 'No fue posible registrar la objeción.';
    }
  }

  // --- Resolver Objeción ---

  protected readonly showResolverModal = signal(false);
  protected resolverAceptar = false;
  protected resolverMotivo = '';
  protected resolverError = '';

  protected openResolverModal(aceptar: boolean): void {
    this.resolverAceptar = aceptar;
    this.resolverMotivo = '';
    this.resolverError = '';
    this.showResolverModal.set(true);
  }

  protected submitResolver(): void {
    const caso = this.casoActivo();
    const objecion = caso ? this.objecionPendiente(caso) : null;
    if (!caso || !objecion) return;
    try {
      this.juridicaService.resolverObjecion(caso.id, objecion.id, { aceptar: this.resolverAceptar, motivo: this.resolverMotivo });
      this.toastService.show(`Objeción ${objecion.id} ${this.resolverAceptar ? 'aceptada' : 'rechazada'}.`);
      this.showResolverModal.set(false);
      this.refrescarCaso(caso.id);
    } catch (error) {
      this.resolverError = error instanceof Error ? error.message : 'No fue posible resolver la objeción.';
    }
  }

  // --- Registrar Actuación manual ---

  protected readonly showActuacionModal = signal(false);
  protected actuacionDescripcion = '';
  protected actuacionError = '';

  protected openActuacionModal(): void {
    this.actuacionDescripcion = '';
    this.actuacionError = '';
    this.showActuacionModal.set(true);
  }

  protected submitActuacion(): void {
    const caso = this.casoActivo();
    if (!caso) return;
    try {
      this.juridicaService.registrarActuacion(caso.id, { descripcion: this.actuacionDescripcion });
      this.toastService.show(`Actuación registrada sobre el caso ${caso.id}.`);
      this.showActuacionModal.set(false);
      this.refrescarCaso(caso.id);
    } catch (error) {
      this.actuacionError = error instanceof Error ? error.message : 'No fue posible registrar la actuación.';
    }
  }

  // --- Cerrar como Pagado ---

  protected cerrarPagado(): void {
    const caso = this.casoActivo();
    if (!caso) return;
    try {
      this.juridicaService.cerrarPagado(caso.id);
      this.toastService.show(`Caso ${caso.id} cerrado por pago total.`);
      this.refrescarCaso(caso.id);
    } catch (error) {
      this.toastService.show(error instanceof Error ? error.message : 'No fue posible cerrar el caso.');
    }
  }

  // --- Archivar ---

  protected readonly showArchivarModal = signal(false);
  protected archivarMotivo = '';
  protected archivarError = '';

  protected openArchivarModal(): void {
    this.archivarMotivo = '';
    this.archivarError = '';
    this.showArchivarModal.set(true);
  }

  protected submitArchivar(): void {
    const caso = this.casoActivo();
    if (!caso) return;
    try {
      this.juridicaService.archivar(caso.id, { motivo: this.archivarMotivo });
      this.toastService.show(`Caso ${caso.id} archivado.`);
      this.showArchivarModal.set(false);
      this.refrescarCaso(caso.id);
    } catch (error) {
      this.archivarError = error instanceof Error ? error.message : 'No fue posible archivar el caso.';
    }
  }
}
