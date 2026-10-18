import { DestroyRef, Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, filter, map, merge, of, switchMap, tap } from 'rxjs';
import { LOAD_STATE } from '../../../core/models/load-state.model';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { MonthContextService, YearMonth } from '../../../core/services/month-context.service';

interface LoadedValue<T> {
  readonly month: YearMonth;
  readonly value: T;
}

export interface MonthScopedResource<T> {
  readonly value: Signal<T | null>;
  readonly hasError: Signal<boolean>;
  readonly isPending: Signal<boolean>;
  reload(): void;
}

function isSameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function monthScopedResource<T>(
  fetch: (month: YearMonth) => Observable<T>
): MonthScopedResource<T> {
  const monthCtx = inject(MonthContextService);
  const facade = inject(FinancesFacadeService);
  const destroyRef = inject(DestroyRef);

  const loaded = signal<LoadedValue<T> | null>(null);
  const failed = signal(false);
  const reloads$ = new Subject<void>();

  const value = computed(() => {
    const current = loaded();
    return current && isSameMonth(current.month, monthCtx.selectedMonth()) ? current.value : null;
  });

  const retryAfterFailure$ = toObservable(facade.loadState).pipe(
    filter((state) => state === LOAD_STATE.loading && failed())
  );

  merge(toObservable(monthCtx.selectedMonth), reloads$, retryAfterFailure$)
    .pipe(
      map(() => monthCtx.selectedMonth()),
      tap(() => failed.set(false)),
      switchMap((month) =>
        fetch(month).pipe(
          map((result): LoadedValue<T> | null => ({ month, value: result })),
          catchError(() => of(null))
        )
      ),
      takeUntilDestroyed(destroyRef)
    )
    .subscribe((result) => {
      failed.set(result === null);
      if (result) loaded.set(result);
    });

  return {
    value,
    hasError: failed.asReadonly(),
    isPending: computed(() => !failed() && value() === null),
    reload: () => reloads$.next(),
  };
}
