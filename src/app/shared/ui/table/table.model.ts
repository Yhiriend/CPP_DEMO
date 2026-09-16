export type TableBadgeVariant = 'success' | 'info' | 'warning' | 'neutral' | 'danger';

export interface TableBadge {
  readonly label: string;
  readonly variant: TableBadgeVariant;
}

export interface TableColumn<T> {
  readonly key: keyof T & string;
  readonly header: string;
  readonly align?: 'left' | 'right' | 'center';
}

export const TABLE_BADGE_VARIANT_CLASSES: Record<TableBadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function isTableBadge(value: unknown): value is TableBadge {
  return typeof value === 'object' && value !== null && 'label' in value && 'variant' in value;
}
