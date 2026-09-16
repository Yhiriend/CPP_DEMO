import { Component, input } from '@angular/core';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.html',
})
export class Breadcrumb {
  readonly items = input.required<readonly string[]>();
}
