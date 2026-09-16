import { Component, inject } from '@angular/core';

import { StatCard } from '../../shared/ui/stat-card/stat-card';
import { EntitiesDebtList } from './components/entities-debt-list/entities-debt-list';
import { PaymentsOverview } from './components/payments-overview/payments-overview';
import { QuickActions } from './components/quick-actions/quick-actions';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [StatCard, EntitiesDebtList, PaymentsOverview, QuickActions],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);

  protected readonly stats = this.dashboardService.getStats();
  protected readonly entitiesWithHighestDebt = this.dashboardService.getEntitiesWithHighestDebt();
  protected readonly latestPayments = this.dashboardService.getLatestPayments();
  protected readonly overdueObligations = this.dashboardService.getOverdueObligations();
  protected readonly quickActions = this.dashboardService.getQuickActions();
}
