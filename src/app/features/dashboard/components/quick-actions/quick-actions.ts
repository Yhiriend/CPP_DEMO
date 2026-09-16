import { Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { QuickAction } from '../../models/dashboard.model';

@Component({
  selector: 'app-quick-actions',
  imports: [LucideDynamicIcon],
  templateUrl: './quick-actions.html',
})
export class QuickActions {
  readonly actions = input.required<readonly QuickAction[]>();
}
