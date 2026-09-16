import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideIdCard } from '@lucide/angular';

import { Breadcrumb } from '../../../shared/ui/breadcrumb/breadcrumb';
import { BeneficiariosService } from '../beneficiarios.service';
import { PensionadosService } from '../pensionados.service';
import { BeneficiariosTab } from './components/beneficiarios-tab/beneficiarios-tab';
import { PENSIONADO_DETAIL_TABS } from './pensionado-detail-tabs';

@Component({
  selector: 'app-pensionado-detail',
  imports: [RouterLink, Breadcrumb, BeneficiariosTab, LucideArrowLeft, LucideIdCard],
  templateUrl: './pensionado-detail.html',
})
export class PensionadoDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly pensionadosService = inject(PensionadosService);
  private readonly beneficiariosService = inject(BeneficiariosService);

  private readonly pensionadoId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly pensionado = this.pensionadosService.getPensionadoById(this.pensionadoId);

  protected readonly totalBeneficiarios = computed(
    () => this.beneficiariosService.getByPensionado(this.pensionadoId).length,
  );

  protected readonly tabs = PENSIONADO_DETAIL_TABS;
  protected readonly activeTabId = signal(
    PENSIONADO_DETAIL_TABS.find((tab) => tab.implemented)?.id ?? PENSIONADO_DETAIL_TABS[0].id,
  );

  protected readonly activeTabLabel = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTabId())?.label ?? '',
  );

  protected selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }
}
