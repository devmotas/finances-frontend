import { Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Transaction } from '../../../core/models/finances.models';
import { seriesEndingNotice, seriesKindLabel } from '../../../core/utils/series-status';
import { isSeriesTransaction } from '../../../core/utils/transaction-series';

@Component({
  selector: 'app-transaction-badges',
  imports: [LucideAngularModule],
  templateUrl: './transaction-badges.component.html',
  styleUrl: './transaction-badges.component.scss',
})
export class TransactionBadgesComponent {
  readonly transaction = input.required<Transaction>();

  readonly isSeries = computed(() => isSeriesTransaction(this.transaction()));
  readonly kindLabel = computed(() => seriesKindLabel(this.transaction()));
  readonly endingNotice = computed(() => seriesEndingNotice(this.transaction()));
}
