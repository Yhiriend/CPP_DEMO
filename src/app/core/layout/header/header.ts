import { Component, inject } from '@angular/core';
import { LucideBell, LucideSearch } from '@lucide/angular';

import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-header',
  imports: [LucideSearch, LucideBell],
  templateUrl: './header.html',
})
export class Header {
  private readonly toastService = inject(ToastService);

  protected showNotifications(): void {
    this.toastService.show('No tienes notificaciones nuevas.');
  }
}
