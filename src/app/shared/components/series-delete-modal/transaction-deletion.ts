import { computed, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Transaction } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { httpErrorMessage } from '../../../core/utils/http-error.util';
import { isSeriesTransaction } from '../../../core/utils/transaction-series';
import { SERIES_DELETE_SCOPE, SeriesDeleteScope } from './series-delete-scope';

const DELETE_FAILED_MESSAGE = 'Não foi possível excluir o lançamento.';

export interface TransactionDeletionTexts {
  itemLabel(t: Transaction): string;
  deletedMessage(t: Transaction): string;
}

export class TransactionDeletion {
  private readonly pending = signal<Transaction | null>(null);
  private readonly runningScope = signal<SeriesDeleteScope | null>(null);

  readonly isOpen = computed(() => this.pending() !== null);
  readonly deletingScope = this.runningScope.asReadonly();
  readonly isSeries = computed(() => {
    const t = this.pending();
    return t !== null && isSeriesTransaction(t);
  });
  readonly itemLabel = computed(() => {
    const t = this.pending();
    return t ? this.texts.itemLabel(t) : '';
  });

  constructor(
    private readonly facade: FinancesFacadeService,
    private readonly toast: ToastService,
    private readonly texts: TransactionDeletionTexts
  ) {}

  request(t: Transaction): void {
    this.pending.set(t);
  }

  cancel(): void {
    if (this.isDeleting()) return;
    this.pending.set(null);
  }

  confirm(scope: SeriesDeleteScope): void {
    const t = this.pending();
    if (t && !this.isDeleting()) this.delete(t, scope);
  }

  private isDeleting(): boolean {
    return this.runningScope() !== null;
  }

  private delete(t: Transaction, scope: SeriesDeleteScope): void {
    const applyToFutureSeries =
      isSeriesTransaction(t) && scope === SERIES_DELETE_SCOPE.thisAndFuture;
    this.runningScope.set(scope);
    this.facade
      .deleteTransaction(t.id, { applyToFutureSeries })
      .pipe(finalize(() => this.runningScope.set(null)))
      .subscribe({
        next: () => {
          this.pending.set(null);
          this.toast.show(this.texts.deletedMessage(t), 'success');
        },
        error: (err: unknown) => this.toast.show(httpErrorMessage(err, DELETE_FAILED_MESSAGE), 'error'),
      });
  }
}
