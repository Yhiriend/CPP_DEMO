import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { Modal } from '../../../shared/ui/modal/modal';
import { resetDemoData } from '../../../shared/persistence/persisted-signal';
import { AuthService } from '../../auth/auth.service';
import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon, Modal],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems = NAV_ITEMS;

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  // --- Restablecer datos de demo ---

  protected readonly showResetModal = signal(false);

  protected confirmarReset(): void {
    resetDemoData();
    window.location.reload();
  }
}
