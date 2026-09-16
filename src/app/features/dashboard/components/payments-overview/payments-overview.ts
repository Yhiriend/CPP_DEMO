import { Component, input } from '@angular/core';

import { PaymentEntry } from '../../models/dashboard.model';

@Component({
  selector: 'app-payments-overview',
  templateUrl: './payments-overview.html',
})
export class PaymentsOverview {
  readonly latestPayments = input.required<readonly PaymentEntry[]>();
  readonly overdueObligations = input.required<readonly PaymentEntry[]>();
}
