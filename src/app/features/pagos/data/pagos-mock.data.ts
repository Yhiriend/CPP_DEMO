import { PagoRecibido } from '../models/pago.model';

export const PAGOS_RECIBIDOS: readonly PagoRecibido[] = [
  {
    idTransaccion: 'PAG-2026-045',
    entidad: 'Alcaldía Mpal. de Muestra',
    origen: { label: 'FONPET', variant: 'neutral' },
    montoRecibido: 52_400_000,
    montoRecibidoLabel: '$52,400,000',
    fecha: '2026-04-02',
    estado: { label: 'Pend. Aplicar', variant: 'warning' },
  },
  {
    idTransaccion: 'PAG-2026-044',
    entidad: 'Gobernación de Ejemplo',
    origen: { label: 'Recursos Propios', variant: 'neutral' },
    montoRecibido: 84_200_000,
    montoRecibidoLabel: '$84,200,000',
    fecha: '2026-03-28',
    estado: { label: 'Aplicado', variant: 'success' },
  },
  {
    idTransaccion: 'PAG-2026-043',
    entidad: 'Inst. Distrital Prueba',
    origen: { label: 'FONPET', variant: 'neutral' },
    montoRecibido: 31_800_000,
    montoRecibidoLabel: '$31,800,000',
    fecha: '2026-03-15',
    estado: { label: 'Pend. Aplicar', variant: 'warning' },
  },
  {
    idTransaccion: 'PAG-2026-042',
    entidad: 'Secretaría Ejemplo Norte',
    origen: { label: 'Recursos Propios', variant: 'neutral' },
    montoRecibido: 22_100_000,
    montoRecibidoLabel: '$22,100,000',
    fecha: '2026-03-05',
    estado: { label: 'Aplicado', variant: 'success' },
  },
  {
    idTransaccion: 'PAG-2026-041',
    entidad: 'Municipio Piloto Sur',
    origen: { label: 'FONPET', variant: 'neutral' },
    montoRecibido: 18_900_000,
    montoRecibidoLabel: '$18,900,000',
    fecha: '2026-02-22',
    estado: { label: 'En Revisión', variant: 'info' },
  },
];
