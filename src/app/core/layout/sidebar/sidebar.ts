import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  protected readonly navItems = NAV_ITEMS;
}
