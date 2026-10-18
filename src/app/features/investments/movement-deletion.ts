import { computed, signal } from '@angular/core';
import { EMPTY, Observable, catchError, finalize, tap } from 'rxjs';
import { InvestmentMovement } from '../../core/models/investment-accounts.models';
import { InvestmentMovementsApiService } from '../../core/services/investment-movements-api.service';
import { ToastService } from '../../core/services/toast.service';
import { httpErrorMessage } from '../../core/utils/http-error.util';
import {
  SERIES_DELETE_SCOPE,
  SeriesDeleteScope,
} from '../../shared/components/series-delete-modal/series-delete-scope';

const FEEDBACK = {
  deleted: 'Lançamento excluído.',
  deleteFailed: 'Não foi possível excluir o lançamento.',
  undoLabel: 'Desfazer',
  undoBusyLabel: 'Desfazendo…',
  undone: 'Exclusão desfeita.',
  undoFailed: 'Não foi possível desfazer a exclusão.',
} as const;

export interface MovementDeletionOptions {
  describe(movement: InvestmentMovement): string;
  changed(): void;
}

export class MovementDeletion {
  private readonly pending = signal<InvestmentMovement | null>(null);
  private readonly deleting = signal(false);

  readonly isOpen = computed(() => this.pending() !== null);
  readonly deletingScope = computed((): SeriesDeleteScope | null =>
    this.deleting() ? SERIES_DELETE_SCOPE.thisMonth : null
  );
  readonly itemLabel = computed(() => {
    const movement = this.pending();
    return movement ? this.options.describe(movement) : '';
  });

  constructor(
    private readonly api: InvestmentMovementsApiService,
    private readonly toast: ToastService,
    private readonly options: MovementDeletionOptions
  ) {}

  request(movement: InvestmentMovement): void {
    this.pending.set(movement);
  }

  cancel(): void {
    if (!this.deleting()) this.pending.set(null);
  }

  confirm(): void {
    const movement = this.pending();
    if (!movement || this.deleting()) return;
    this.deleting.set(true);
    this.api
      .delete(movement.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: (deleted) => this.afterDelete(deleted),
        error: (err: unknown) => this.toast.show(httpErrorMessage(err, FEEDBACK.deleteFailed), 'error'),
      });
  }

  private afterDelete(deleted: InvestmentMovement[]): void {
    this.pending.set(null);
    this.options.changed();
    this.toast.showWithAction(FEEDBACK.deleted, 'success', {
      label: FEEDBACK.undoLabel,
      busyLabel: FEEDBACK.undoBusyLabel,
      run: () => this.undo(deleted),
    });
  }

  private undo(deleted: InvestmentMovement[]): Observable<unknown> {
    return this.api.restore(deleted).pipe(
      tap(() => {
        this.options.changed();
        this.toast.show(FEEDBACK.undone, 'success');
      }),
      catchError((err: unknown) => {
        this.toast.show(httpErrorMessage(err, FEEDBACK.undoFailed), 'error');
        return EMPTY;
      })
    );
  }
}
