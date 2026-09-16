import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './header/header';
import { Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './layout.html',
})
export class Layout {}
