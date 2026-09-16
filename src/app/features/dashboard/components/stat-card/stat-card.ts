import { Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { DashboardStat } from '../../models/dashboard.model';

@Component({
  selector: 'app-stat-card',
  imports: [LucideDynamicIcon],
  templateUrl: './stat-card.html',
})
export class StatCard {
  readonly stat = input.required<DashboardStat>();
}
