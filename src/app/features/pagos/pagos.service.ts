import { Injectable } from '@angular/core';

import { StatCardData } from '../../shared/ui/stat-card/stat-card.model';
import { PAGOS_RECIBIDOS } from './data/pagos-mock.data';
import { PagoRecibido } from './models/pago.model';
import { PagoTabId } from './pagos-tabs';

/** Backed by mock data for now; swap for an HTTP call once the API is ready. */
@Injectable({ providedIn: 'root' })
export class PagosService {
  getPagosPorTab(tabId: PagoTabId): readonly PagoRecibido[] {
    switch (tabId) {
      case 'pendientes':
        return PAGOS_RECIBIDOS.filter((pago) => pago.estado.label === 'Pend. Aplicar');
      case 'aplicados':
        return PAGOS_RECIBIDOS.filter((pago) => pago.estado.label === 'Aplicado');
      case 'fonpet':
        return PAGOS_RECIBIDOS.filter((pago) => pago.origen.label === 'FONPET');
      case 'recursos-propios':
        return PAGOS_RECIBIDOS.filter((pago) => pago.origen.label === 'Recursos Propios');
      case 'todos':
        return PAGOS_RECIBIDOS;
    }
  }

  getKpis(): readonly StatCardData[] {
    const pendientes = PAGOS_RECIBIDOS.filter((pago) => pago.estado.label === 'Pend. Aplicar');
    const aplicados = PAGOS_RECIBIDOS.filter((pago) => pago.estado.label === 'Aplicado');
    const enRevision = PAGOS_RECIBIDOS.filter((pago) => pago.estado.label === 'En Revisión');

    return [
      {
        label: 'Total Recibido (Mes)',
        value: this.formatTotal(PAGOS_RECIBIDOS),
        subtitle: `${PAGOS_RECIBIDOS.length} transacciones`,
      },
      {
        label: 'Pendiente de Aplicar',
        value: this.formatTotal(pendientes),
        subtitle: `${pendientes.length} transacciones`,
      },
      {
        label: 'Total Aplicado',
        value: this.formatTotal(aplicados),
        subtitle: `${aplicados.length} transacciones`,
      },
      {
        label: 'En Revisión',
        value: this.formatTotal(enRevision),
        subtitle: `${enRevision.length} ${enRevision.length === 1 ? 'transacción' : 'transacciones'}`,
      },
    ];
  }

  private formatTotal(pagos: readonly PagoRecibido[]): string {
    const total = pagos.reduce((sum, pago) => sum + pago.montoRecibido, 0);
    return `$${total.toLocaleString('en-US')}`;
  }
}
