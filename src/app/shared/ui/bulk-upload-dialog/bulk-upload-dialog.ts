import { Component, input, output, signal } from '@angular/core';
import { LucideUpload } from '@lucide/angular';

import { parseCsvRows } from '../../utils/csv';
import { Modal } from '../modal/modal';
import { BulkUploadOutcome } from './bulk-upload-dialog.model';

/**
 * Generic CSV bulk-upload flow: pick a file, validate every row with a
 * caller-supplied function, show a valid/rejected summary, and emit the
 * valid records on confirmation. Parsing is shared; validation rules
 * (required columns, duplicate checks) stay with each feature.
 */
@Component({
  selector: 'app-bulk-upload-dialog',
  imports: [Modal, LucideUpload],
  templateUrl: './bulk-upload-dialog.html',
})
export class BulkUploadDialog<T> {
  readonly title = input('Cargue Masivo');
  readonly templateColumns = input.required<readonly string[]>();
  readonly validate = input.required<(rows: readonly Record<string, string>[]) => BulkUploadOutcome<T>>();

  readonly closed = output<void>();
  readonly confirmed = output<readonly T[]>();

  protected readonly fileName = signal('');
  protected readonly outcome = signal<BulkUploadOutcome<T> | null>(null);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.fileName.set(file.name);
    file.text().then((text) => {
      const rows = parseCsvRows(text);
      this.outcome.set(this.validate()(rows));
    });
  }

  protected confirm(): void {
    const result = this.outcome();
    if (!result || result.valid.length === 0) {
      return;
    }
    this.confirmed.emit(result.valid.map((row) => row.data));
  }
}
