import { Component, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { QuickAction } from '../../models/dashboard.model';

@Component({
  selector: 'app-quick-actions',
  imports: [LucideDynamicIcon],
  templateUrl: './quick-actions.html',
})
export class QuickActions {
  private readonly toastService = inject(ToastService);

  readonly actions = input.required<readonly QuickAction[]>();

  protected runAction(action: QuickAction): void {
    this.toastService.show(`"${action.label}" estará disponible cuando el backend esté conectado.`);
  }
}
