export interface DashboardStat {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly trendLabel: string;
}

export interface EntityDebt {
  readonly name: string;
  readonly percentage: number;
}

export interface PaymentEntry {
  readonly date: string;
  readonly entity: string;
  readonly amount: string;
}

export interface QuickAction {
  readonly label: string;
  readonly icon: string;
}
