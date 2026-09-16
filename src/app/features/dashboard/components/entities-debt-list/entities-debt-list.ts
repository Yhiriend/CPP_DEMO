import { Component, input } from '@angular/core';

import { EntityDebt } from '../../models/dashboard.model';

@Component({
  selector: 'app-entities-debt-list',
  templateUrl: './entities-debt-list.html',
})
export class EntitiesDebtList {
  readonly entities = input.required<readonly EntityDebt[]>();
}
