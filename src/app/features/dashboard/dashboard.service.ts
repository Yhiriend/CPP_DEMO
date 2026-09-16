import { Injectable } from '@angular/core';

import {
  DASHBOARD_STATS,
  ENTITIES_WITH_HIGHEST_DEBT,
  LATEST_PAYMENTS,
  OVERDUE_OBLIGATIONS,
  QUICK_ACTIONS,
} from './data/dashboard-mock.data';

/** Backed by mock data for now; swap the bodies for HTTP calls once the API is ready. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  getStats() {
    return DASHBOARD_STATS;
  }

  getEntitiesWithHighestDebt() {
    return ENTITIES_WITH_HIGHEST_DEBT;
  }

  getLatestPayments() {
    return LATEST_PAYMENTS;
  }

  getOverdueObligations() {
    return OVERDUE_OBLIGATIONS;
  }

  getQuickActions() {
    return QUICK_ACTIONS;
  }
}
