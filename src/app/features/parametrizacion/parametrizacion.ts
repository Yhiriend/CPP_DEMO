import { Component, computed, signal } from '@angular/core';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { SystemStatusBar } from '../../shared/ui/system-status-bar/system-status-bar';
import { DtfRateSettings } from './components/dtf-rate-settings/dtf-rate-settings';
import { PARAMETRIZACION_TABS } from './parametrizacion-tabs';

@Component({
  selector: 'app-parametrizacion',
  imports: [DtfRateSettings, Breadcrumb, SystemStatusBar],
  templateUrl: './parametrizacion.html',
})
export class Parametrizacion {
  protected readonly tabs = PARAMETRIZACION_TABS;
  protected readonly activeTabId = signal(PARAMETRIZACION_TABS[0].id);

  protected readonly activeTabLabel = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTabId())?.label ?? '',
  );

  protected selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }
}
