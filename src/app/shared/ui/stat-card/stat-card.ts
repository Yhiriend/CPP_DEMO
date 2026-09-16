import { Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { StatCardData } from './stat-card.model';

@Component({
  selector: 'app-stat-card',
  imports: [LucideDynamicIcon],
  templateUrl: './stat-card.html',
})
export class StatCard {
  readonly stat = input.required<StatCardData>();
}
