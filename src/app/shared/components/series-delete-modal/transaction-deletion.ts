import { computed, signal } from '@angular/core';
import { catchError, EMPTY, finalize, Observable, tap } from 'rxjs';
import { Transaction, TransactionRestoreDto } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatBrl } from '../../../core/utils/brl-format';
import { httpErrorMessage } from '../../../core/utils/http-error.util';
import { isSeriesTransaction } from '../../../core/utils/transaction-series';
import { SERIES_DELETE_SCOPE, SeriesDeleteScope } from './series-delete-scope';

const DELETE_FAILED_MESSAGE = 'Não foi possível excluir o lançamento.';
const UNDO_LABEL = 'Desfazer';
const UNDO_BUSY_LABEL = 'Desfazendo…';
const UNDO_SUCCESS_MESSAGE = 'Exclusão desfeita.';
const UNDO_FAILED_MESSAGE = 'Não foi possível desfazer a exclusão.';

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
    return t ? this.describe(t) : '';
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

  private describe(t: Transaction): string {
    const kind = this.texts.itemLabel(t);
    const amount = formatBrl(Math.abs(t.amount));
    const name = t.description?.trim() || this.facade.getCategory(t.categoryId)?.name;
    return name ? `${kind} “${name}” de ${amount}` : `${kind} de ${amount}`;
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
        next: (deleted) => {
          this.pending.set(null);
          this.notifyDeleted(t, deleted);
        },
        error: (err: unknown) => this.toast.show(httpErrorMessage(err, DELETE_FAILED_MESSAGE), 'error'),
      });
  }

  private notifyDeleted(t: Transaction, deleted: Transaction[]): void {
    this.toast.showWithAction(this.texts.deletedMessage(t), 'success', {
      label: UNDO_LABEL,
      busyLabel: UNDO_BUSY_LABEL,
      run: () => this.undo(deleted),
    });
  }

  private undo(deleted: Transaction[]): Observable<unknown> {
    return this.facade.restoreTransactions(deleted.map(toRestoreDto)).pipe(
      tap(() => this.toast.show(UNDO_SUCCESS_MESSAGE, 'success')),
      catchError((err: unknown) => {
        this.toast.show(httpErrorMessage(err, UNDO_FAILED_MESSAGE), 'error');
        return EMPTY;
      })
    );
  }
}

function toRestoreDto(t: Transaction): TransactionRestoreDto {
  return {
    categoryId: t.categoryId,
    description: t.description || null,
    amount: t.amount,
    date: t.date,
    schedule: t.schedule,
    recurrenceId: t.recurrenceId ?? null,
    recurrenceIndex: t.recurrenceIndex ?? null,
  };
}
