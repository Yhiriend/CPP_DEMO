export type TipoReporte = 'Mensual' | 'Anual' | 'Financiero' | 'Contable' | 'Jurídico';
export const TIPOS_REPORTE: readonly TipoReporte[] = ['Mensual', 'Anual', 'Financiero', 'Contable', 'Jurídico'];

export interface FiltrosReporte {
  readonly tipo: TipoReporte;
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  readonly entidadId: string | null;
}

export interface IndicadorReporte {
  readonly etiqueta: string;
  readonly valor: string;
}

export interface FilaDetalleReporte {
  readonly [columna: string]: string;
}

export interface TablaDetalleReporte {
  readonly titulo: string;
  readonly columnas: readonly string[];
  readonly filas: readonly FilaDetalleReporte[];
}

export interface ReporteGenerado {
  readonly id: string;
  readonly tipo: TipoReporte;
  readonly fechaGeneracion: string;
  readonly timestamp: string;
  readonly filtros: FiltrosReporte;
  readonly entidad: string;
  readonly indicadores: readonly IndicadorReporte[];
  readonly tablas: readonly TablaDetalleReporte[];
  readonly generadoPor: string;
}
