import { Component } from '@angular/core';
import { LucideBell, LucideSearch } from '@lucide/angular';

@Component({
  selector: 'app-header',
  imports: [LucideSearch, LucideBell],
  templateUrl: './header.html',
})
export class Header {}
