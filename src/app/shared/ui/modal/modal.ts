import { Component, HostListener, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-modal',
  imports: [LucideX],
  templateUrl: './modal.html',
})
export class Modal {
  readonly title = input.required<string>();
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close.emit();
  }
}
