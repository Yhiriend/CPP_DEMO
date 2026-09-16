import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideBuilding2, LucideFileText } from '@lucide/angular';

import { Breadcrumb } from '../../../shared/ui/breadcrumb/breadcrumb';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { EntidadesService } from '../entidades.service';
import { CarteraEstadoCuenta } from './components/cartera-estado-cuenta/cartera-estado-cuenta';
import { ENTIDAD_DETAIL_TABS } from './entidad-detail-tabs';

@Component({
  selector: 'app-entidad-detail',
  imports: [RouterLink, Breadcrumb, CarteraEstadoCuenta, LucideArrowLeft, LucideBuilding2, LucideFileText],
  templateUrl: './entidad-detail.html',
})
export class EntidadDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly entidadesService = inject(EntidadesService);
  private readonly toastService = inject(ToastService);

  private readonly entidadId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly entidad = this.entidadesService.getEntidadById(this.entidadId);

  protected readonly tabs = ENTIDAD_DETAIL_TABS;
  protected readonly activeTabId = signal(
    ENTIDAD_DETAIL_TABS.find((tab) => tab.implemented)?.id ?? ENTIDAD_DETAIL_TABS[0].id,
  );

  protected readonly activeTabLabel = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTabId())?.label ?? '',
  );

  protected selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  protected generarEstadoDeCuenta(): void {
    this.toastService.show('La generación del estado de cuenta estará disponible próximamente.');
  }
}
