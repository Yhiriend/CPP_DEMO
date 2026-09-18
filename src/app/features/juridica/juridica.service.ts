import { Injectable, inject } from '@angular/core';

import { AuditoriaService } from '../../core/auditoria/auditoria.service';
import { persistedSignal } from '../../shared/persistence/persisted-signal';
import { TableBadgeVariant } from '../../shared/ui/table/table.model';
import { todayIso } from '../../shared/utils/date';
import CASOS_SEED from '../../fake_data/casos-juridicos.json';
import { CuentaCobro } from '../cuentas-de-cobro/models/cuenta-cobro.model';
import { CuentasDeCobroService } from '../cuentas-de-cobro/cuentas-de-cobro.service';
import { ImputacionesService } from '../imputaciones/imputaciones.service';
import {
  Actuacion,
  ArchivarCasoValue,
  CasoJuridico,
  ESTADOS_TERMINALES_CASO,
  EstadoCasoJuridico,
  FLUJO_CASO_JURIDICO,
  Objecion,
  RadicarCasoValue,
  RegistrarActuacionValue,
  RegistrarObjecionValue,
  ResolverObjecionValue,
  TipoActuacion,
} from './models/caso-juridico.model';

const ESTADO_VARIANT: Record<EstadoCasoJuridico, TableBadgeVariant> = {
  Radicado: 'neutral',
  'Requerimiento Enviado': 'warning',
  'Objeción en Trámite': 'warning',
  'Proceso de Cobro Coactivo': 'danger',
  'Acuerdo de Pago': 'info',
  'Objeción Aceptada': 'neutral',
  Pagado: 'success',
  Archivado: 'neutral',
};

/** Tipo de actuación que se registra automáticamente al entrar a cada estado del flujo lineal. */
const TIPO_ACTUACION_POR_ESTADO: Partial<Record<EstadoCasoJuridico, TipoActuacion>> = {
  Radicado: 'Radicación',
  'Requerimiento Enviado': 'Requerimiento de Pago',
  'Proceso de Cobro Coactivo': 'Cobro Coactivo',
  'Acuerdo de Pago': 'Acuerdo de Pago',
};

const SESSION_USER = 'admin@sgdp.gov.co';

/**
 * HU derivada del flujo financiero ampliado ("Gestión jurídica de cobro sobre cartera vencida") —
 * casos, objeciones y actuaciones para Cuentas de Cobro que ya están Vencidas (CCAL-005) y no han
 * sido cubiertas. No inventa un nuevo saldo: el cierre por pago se valida en vivo contra Imputaciones.
 */
@Injectable({ providedIn: 'root' })
export class JuridicaService {
  private readonly cuentasDeCobroService = inject(CuentasDeCobroService);
  private readonly imputacionesService = inject(ImputacionesService);
  private readonly auditoriaService = inject(AuditoriaService);

  private readonly _casos = persistedSignal<CasoJuridico[]>('casos-juridicos', CASOS_SEED as CasoJuridico[]);
  readonly casos = this._casos.asReadonly();

  private casoCorrelativo = this._casos().length;
  private actuacionCorrelativo = this._casos().reduce((sum, c) => sum + c.historial.length, 0);
  private objecionCorrelativo = this._casos().reduce((sum, c) => sum + c.objeciones.length, 0);

  getById(id: string): CasoJuridico | undefined {
    return this._casos().find((c) => c.id === id);
  }

  /** Cuentas Vencidas y no cubiertas, sin un caso jurídico activo (no terminal) ya abierto. */
  cuentasElegibles(): readonly CuentaCobro[] {
    const idsConCasoActivo = new Set(
      this._casos().filter((c) => !ESTADOS_TERMINALES_CASO.includes(c.estado.label as EstadoCasoJuridico)).map((c) => c.cuentaCobroId),
    );

    return this.cuentasDeCobroService.cuentasCobro().filter((cuenta) => {
      if (idsConCasoActivo.has(cuenta.idCuenta)) return false;
      if (this.imputacionesService.estaCubierta(cuenta)) return false;
      return this.cuentasDeCobroService.estadoVisual(cuenta).label === 'Vencida';
    });
  }

  /** Indica si, en vivo, la cuenta detrás del caso ya quedó cubierta (sirve para habilitar Cerrar como Pagado). */
  estaCubierta(caso: CasoJuridico): boolean {
    const cuenta = this.cuentasDeCobroService.cuentasCobro().find((c) => c.idCuenta === caso.cuentaCobroId);
    return cuenta ? this.imputacionesService.estaCubierta(cuenta) : false;
  }

  /** Abre un caso jurídico sobre una cuenta vencida y elegible. */
  radicar(value: RadicarCasoValue): CasoJuridico {
    const cuenta = this.cuentasElegibles().find((c) => c.idCuenta === value.cuentaCobroId);
    if (!cuenta) {
      throw new Error(`La cuenta ${value.cuentaCobroId} no está vencida, ya fue cubierta, o ya tiene un caso jurídico activo.`);
    }

    const ahora = todayIso();
    const nuevo: CasoJuridico = {
      id: this.nextCasoId(),
      cuentaCobroId: cuenta.idCuenta,
      entidadId: cuenta.entidadId,
      entidad: cuenta.entidad,
      valor: cuenta.capital,
      valorLabel: cuenta.capitalLabel,
      fechaVencimientoCuenta: cuenta.fechaVencimiento ?? cuenta.fechaGeneracion,
      fechaRadicacion: ahora,
      estado: { label: 'Radicado', variant: ESTADO_VARIANT.Radicado },
      historial: [
        this.crearActuacion('Radicación', `Caso radicado por mora en la Cuenta de Cobro ${cuenta.idCuenta} (${cuenta.capitalLabel}).`),
      ],
      objeciones: [],
      responsable: SESSION_USER,
    };

    this._casos.update((list) => [nuevo, ...list]);
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Radicar Caso',
      entidadAfectada: `Caso ${nuevo.id} (${nuevo.entidad})`,
      detalle: `Radicación de caso jurídico sobre la cuenta ${cuenta.idCuenta} por ${nuevo.valorLabel}.`,
    });
    return nuevo;
  }

  /** Avanza el caso al siguiente estado del flujo lineal (Radicado → Requerimiento → Coactivo → Acuerdo de Pago). */
  avanzar(id: string, descripcion: string): void {
    const caso = this.requireCaso(id);
    const actual = caso.estado.label as EstadoCasoJuridico;
    const indice = FLUJO_CASO_JURIDICO.indexOf(actual);
    if (indice === -1 || indice === FLUJO_CASO_JURIDICO.length - 1) {
      throw new Error(`El caso ${id} no tiene un siguiente paso lineal disponible desde "${actual}".`);
    }
    if (!descripcion.trim()) {
      throw new Error('Registre una descripción de la actuación.');
    }

    const siguiente = FLUJO_CASO_JURIDICO[indice + 1];
    const tipo = TIPO_ACTUACION_POR_ESTADO[siguiente] ?? 'Actuación Manual';
    this.aplicarCambio(id, siguiente, this.crearActuacion(tipo, descripcion.trim()));
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Avanzar Caso',
      entidadAfectada: `Caso ${id}`,
      detalle: `${actual} → ${siguiente}: ${descripcion.trim()}`,
    });
  }

  /** El deudor radica una objeción — solo mientras el caso espera respuesta al requerimiento. */
  registrarObjecion(id: string, value: RegistrarObjecionValue): void {
    const caso = this.requireCaso(id);
    if (caso.estado.label !== 'Requerimiento Enviado') {
      throw new Error('Solo se puede registrar una objeción mientras el caso está en "Requerimiento Enviado".');
    }
    if (!value.motivo.trim() || !value.radicadaPor.trim()) {
      throw new Error('Registre el motivo de la objeción y quién la radica.');
    }

    const objecion: Objecion = {
      id: this.nextObjecionId(),
      fecha: todayIso(),
      motivo: value.motivo.trim(),
      radicadaPor: value.radicadaPor.trim(),
      estado: 'Pendiente',
      fechaResolucion: null,
      resolucionMotivo: null,
    };
    const actuacion = this.crearActuacion('Objeción Recibida', `${value.radicadaPor.trim()} radicó objeción: ${value.motivo.trim()}`);

    this._casos.update((list) =>
      list.map((c) =>
        c.id === id
          ? {
              ...c,
              estado: { label: 'Objeción en Trámite', variant: ESTADO_VARIANT['Objeción en Trámite'] },
              objeciones: [objecion, ...c.objeciones],
              historial: [actuacion, ...c.historial],
            }
          : c,
      ),
    );
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Registrar Objeción',
      entidadAfectada: `Caso ${id}`,
      detalle: `Objeción ${objecion.id}: ${objecion.motivo}`,
    });
  }

  /** Resuelve la objeción pendiente: Aceptada cierra el caso; Rechazada retoma el cobro coactivo. */
  resolverObjecion(id: string, objecionId: string, value: ResolverObjecionValue): void {
    const caso = this.requireCaso(id);
    const objecion = caso.objeciones.find((o) => o.id === objecionId);
    if (!objecion || objecion.estado !== 'Pendiente') {
      throw new Error(`La objeción ${objecionId} no está pendiente de resolución.`);
    }
    if (!value.motivo.trim()) {
      throw new Error('Registre el motivo de la resolución.');
    }

    const ahora = todayIso();
    const nuevoEstadoObjecion: Objecion = {
      ...objecion,
      estado: value.aceptar ? 'Aceptada' : 'Rechazada',
      fechaResolucion: ahora,
      resolucionMotivo: value.motivo.trim(),
    };
    const nuevoEstadoCaso: EstadoCasoJuridico = value.aceptar ? 'Objeción Aceptada' : 'Proceso de Cobro Coactivo';
    const actuacion = this.crearActuacion(
      'Objeción Resuelta',
      `Objeción ${value.aceptar ? 'aceptada' : 'rechazada'}: ${value.motivo.trim()}`,
    );

    this._casos.update((list) =>
      list.map((c) =>
        c.id === id
          ? {
              ...c,
              estado: { label: nuevoEstadoCaso, variant: ESTADO_VARIANT[nuevoEstadoCaso] },
              objeciones: c.objeciones.map((o) => (o.id === objecionId ? nuevoEstadoObjecion : o)),
              historial: [actuacion, ...c.historial],
            }
          : c,
      ),
    );
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Resolver Objeción',
      entidadAfectada: `Caso ${id}`,
      detalle: `Objeción ${objecionId} ${value.aceptar ? 'aceptada' : 'rechazada'}: ${value.motivo.trim()}`,
    });
  }

  /** Registro libre de una diligencia (visita, llamada, oficio) que no cambia el estado del caso. */
  registrarActuacion(id: string, value: RegistrarActuacionValue): void {
    const caso = this.requireCaso(id);
    if (ESTADOS_TERMINALES_CASO.includes(caso.estado.label as EstadoCasoJuridico)) {
      throw new Error(`El caso ${id} ya está cerrado.`);
    }
    if (!value.descripcion.trim()) {
      throw new Error('Registre la descripción de la actuación.');
    }

    const actuacion = this.crearActuacion('Actuación Manual', value.descripcion.trim());
    this._casos.update((list) => list.map((c) => (c.id === id ? { ...c, historial: [actuacion, ...c.historial] } : c)));
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Registrar Actuación',
      entidadAfectada: `Caso ${id}`,
      detalle: value.descripcion.trim(),
    });
  }

  /** Cierra el caso porque la cuenta ya quedó cubierta en Imputaciones — se valida en vivo, no se asume. */
  cerrarPagado(id: string): void {
    const caso = this.requireCaso(id);
    if (!this.estaCubierta(caso)) {
      throw new Error('La cuenta de cobro asociada aún no está completamente pagada.');
    }
    this.aplicarCambio(id, 'Pagado', this.crearActuacion('Cierre', 'Caso cerrado: la Cuenta de Cobro fue pagada en su totalidad.'));
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Cerrar Caso (Pagado)',
      entidadAfectada: `Caso ${id}`,
      detalle: 'Cierre del caso por pago total de la cuenta asociada.',
    });
  }

  /** Archiva el caso (prescripción, desistimiento, entidad liquidada, etc.) desde cualquier estado no terminal. */
  archivar(id: string, value: ArchivarCasoValue): void {
    const caso = this.requireCaso(id);
    if (ESTADOS_TERMINALES_CASO.includes(caso.estado.label as EstadoCasoJuridico)) {
      throw new Error(`El caso ${id} ya está cerrado.`);
    }
    if (!value.motivo.trim()) {
      throw new Error('Registre el motivo del archivo.');
    }

    this.aplicarCambio(id, 'Archivado', this.crearActuacion('Cierre', `Caso archivado: ${value.motivo.trim()}`));
    this.auditoriaService.registrar({
      modulo: 'Gestión Jurídica',
      accion: 'Archivar Caso',
      entidadAfectada: `Caso ${id}`,
      detalle: value.motivo.trim(),
    });
  }

  private requireCaso(id: string): CasoJuridico {
    const caso = this.getById(id);
    if (!caso) {
      throw new Error(`No existe el caso ${id}.`);
    }
    return caso;
  }

  private aplicarCambio(id: string, estado: EstadoCasoJuridico, actuacion: Actuacion): void {
    this._casos.update((list) =>
      list.map((c) =>
        c.id === id ? { ...c, estado: { label: estado, variant: ESTADO_VARIANT[estado] }, historial: [actuacion, ...c.historial] } : c,
      ),
    );
  }

  private crearActuacion(tipo: TipoActuacion, descripcion: string): Actuacion {
    return { id: this.nextActuacionId(), fecha: todayIso(), tipo, descripcion, responsable: SESSION_USER };
  }

  private nextCasoId(): string {
    this.casoCorrelativo += 1;
    return `CJ-${new Date().getFullYear()}-${String(this.casoCorrelativo).padStart(3, '0')}`;
  }

  private nextActuacionId(): string {
    this.actuacionCorrelativo += 1;
    return `ACT-${new Date().getFullYear()}-${String(this.actuacionCorrelativo).padStart(3, '0')}`;
  }

  private nextObjecionId(): string {
    this.objecionCorrelativo += 1;
    return `OBJ-${new Date().getFullYear()}-${String(this.objecionCorrelativo).padStart(3, '0')}`;
  }
}
