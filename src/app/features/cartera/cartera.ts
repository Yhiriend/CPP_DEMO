import { Component, computed, inject, signal } from '@angular/core';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { CARTERA_TABS } from './cartera-tabs';
import { CarteraService } from './cartera.service';
import { EstadoCuentaGeneral } from './components/estado-cuenta-general/estado-cuenta-general';

@Component({
  selector: 'app-cartera',
  imports: [Breadcrumb, StatCard, EstadoCuentaGeneral],
  templateUrl: './cartera.html',
})
export class Cartera {
  private readonly carteraService = inject(CarteraService);

  protected readonly kpis = this.carteraService.getKpis();
  protected readonly tabs = CARTERA_TABS;
  protected readonly activeTabId = signal(CARTERA_TABS[0].id);

  protected readonly activeTabLabel = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTabId())?.label ?? '',
  );

  protected selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }
}
