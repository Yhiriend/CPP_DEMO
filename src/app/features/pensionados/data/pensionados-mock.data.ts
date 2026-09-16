import { Pensionado } from '../models/pensionado.model';

export const PENSIONADOS: readonly Pensionado[] = [
  {
    tipoDocumento: { label: 'C.C.', variant: 'neutral' },
    numeroDocumento: '19.876.543',
    nombresApellidos: 'Juan Pérez Gómez',
    entidadPrincipal: 'Gobernación de Ejemplo',
    estado: { label: 'Activo', variant: 'success' },
  },
  {
    tipoDocumento: { label: 'C.C.', variant: 'neutral' },
    numeroDocumento: '52.341.871',
    nombresApellidos: 'María Rodríguez Salinas',
    entidadPrincipal: 'Alcaldía Municipal de Muestra',
    estado: { label: 'Activo', variant: 'success' },
  },
  {
    tipoDocumento: { label: 'C.E.', variant: 'neutral' },
    numeroDocumento: '00.847.236',
    nombresApellidos: 'Carlos Herrera Mendoza',
    entidadPrincipal: 'Instituto Distrital de Prueba',
    estado: { label: 'Suspendido', variant: 'warning' },
  },
  {
    tipoDocumento: { label: 'C.C.', variant: 'neutral' },
    numeroDocumento: '41.203.658',
    nombresApellidos: 'Ana Lucía Torres Vega',
    entidadPrincipal: 'Gobernación de Ejemplo',
    estado: { label: 'Activo', variant: 'success' },
  },
  {
    tipoDocumento: { label: 'C.C.', variant: 'neutral' },
    numeroDocumento: '80.456.120',
    nombresApellidos: 'Roberto Fuentes Díaz',
    entidadPrincipal: 'Secretaría Ejemplo Norte',
    estado: { label: 'Fallecido', variant: 'neutral' },
  },
];
