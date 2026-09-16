import { Injectable, signal } from '@angular/core';

import { ENTIDADES, OBLIGACIONES_POR_ENTIDAD } from './data/entidades-mock.data';
import { Entidad, ObligacionCartera } from './models/entidad.model';

/** Backed by mock data for now; swap for an HTTP-backed store once the API is ready. */
@Injectable({ providedIn: 'root' })
export class EntidadesService {
  private readonly _entidades = signal<readonly Entidad[]>(ENTIDADES);
  readonly entidades = this._entidades.asReadonly();

  getEntidadById(id: string): Entidad | undefined {
    return this._entidades().find((entidad) => entidad.id === id);
  }

  getObligaciones(entidadId: string): readonly ObligacionCartera[] {
    return OBLIGACIONES_POR_ENTIDAD[entidadId] ?? [];
  }
}
