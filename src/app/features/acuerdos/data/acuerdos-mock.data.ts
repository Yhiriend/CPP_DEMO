import { Acuerdo } from '../models/acuerdo.model';

export const ACUERDOS: readonly Acuerdo[] = [
  {
    idRadicado: 'FPT-2026-088',
    entidad: 'Inst. Distrital de Prueba',
    tipoAcuerdo: 'Acuerdo de Pago',
    valorSolicitado: '$850,000,000',
    fechaRadicacion: '2026-03-12',
    estado: { label: 'Desembolsado', variant: 'success' },
  },
  {
    idRadicado: 'FPT-2026-091',
    entidad: 'Alcaldía Mpal. de Muestra',
    tipoAcuerdo: 'Prórroga FONPET',
    valorSolicitado: '$320,500,000',
    fechaRadicacion: '2026-04-02',
    estado: { label: 'Aprobado', variant: 'info' },
  },
  {
    idRadicado: 'FPT-2026-095',
    entidad: 'Gobernación de Ejemplo',
    tipoAcuerdo: 'Acuerdo de Pago',
    valorSolicitado: '$1,240,000,000',
    fechaRadicacion: '2026-04-18',
    estado: { label: 'En evaluación', variant: 'warning' },
  },
  {
    idRadicado: 'FPT-2026-097',
    entidad: 'Secretaría Ejemplo Norte',
    tipoAcuerdo: 'Revisión de Saldos',
    valorSolicitado: '$94,300,000',
    fechaRadicacion: '2026-05-03',
    estado: { label: 'Radicado', variant: 'neutral' },
  },
  {
    idRadicado: 'FPT-2026-099',
    entidad: 'Municipio Piloto Sur',
    tipoAcuerdo: 'Prórroga FONPET',
    valorSolicitado: '$218,700,000',
    fechaRadicacion: '2026-05-21',
    estado: { label: 'Rechazado', variant: 'danger' },
  },
];
