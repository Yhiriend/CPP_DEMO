import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, computed, contentChild, input, signal } from '@angular/core';

import { TABLE_BADGE_VARIANT_CLASSES, TableBadgeVariant, TableColumn, isTableBadge } from './table.model';

/**
 * Generic data table with a toolbar slot ([table-actions]), an optional
 * per-row actions slot (#rowActions template) and built-in client-side
 * pagination. Expect the shape of this component to evolve as more pages
 * adopt it.
 */
@Component({
  selector: 'app-table',
  imports: [NgTemplateOutlet],
  templateUrl: './table.html',
})
export class Table<T extends object> {
  readonly title = input<string>();
  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly pageSize = input(10);
  readonly emptyMessage = input('No hay datos para mostrar.');

  protected readonly rowActionsTemplate = contentChild<
    TemplateRef<{ $implicit: T }>,
    TemplateRef<{ $implicit: T }>
  >('rowActions', { read: TemplateRef });

  protected readonly isTableBadge = isTableBadge;

  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / this.pageSize())),
  );

  protected readonly pagedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  protected readonly rangeStart = computed(() =>
    this.rows().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );

  protected readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.rows().length),
  );

  protected cellValue(row: T, column: TableColumn<T>): unknown {
    return row[column.key];
  }

  protected badgeClasses(variant: TableBadgeVariant): string {
    return TABLE_BADGE_VARIANT_CLASSES[variant];
  }

  protected goToPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }
}
