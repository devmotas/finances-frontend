import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import {
  Category,
  CategoryCreateDto,
  Flow,
  MonthTotals,
  Transaction,
  TransactionCreateDto,
} from '../models/finances.models';
import { computeMonthTotals, filterTransactionsByMonth } from '../utils/finance-calculations';
import { AuthTokenService } from './auth-token.service';
import { CategoryApiService } from './category-api.service';
import { MonthContextService } from './month-context.service';
import { RecurrenceApiService, RecurrenceCreateDto } from './recurrence-api.service';
import { TransactionApiService } from './transaction-api.service';
import { UserApiService } from './user-api.service';
import { UserProfileService } from './user-profile.service';

@Injectable({ providedIn: 'root' })
export class FinancesFacadeService {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly transactionApi = inject(TransactionApiService);
  private readonly recurrenceApi = inject(RecurrenceApiService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly tokens = inject(AuthTokenService);
  private readonly userApi = inject(UserApiService);
  private readonly userProfile = inject(UserProfileService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _categories = signal<Category[]>([]);
  private readonly _transactions = signal<Transaction[]>([]);

  readonly categories = computed(() => this._categories());
  readonly transactions = computed(() => this._transactions());

  readonly monthTransactions = computed(() => {
    const { year, month } = this.monthCtx.selectedMonth();
    return filterTransactionsByMonth(this._transactions(), year, month);
  });

  readonly monthTotals = computed((): MonthTotals => {
    const { year, month } = this.monthCtx.selectedMonth();
    return computeMonthTotals(
      {
        schemaVersion: 1,
        categories: this._categories(),
        transactions: this._transactions(),
      },
      year,
      month
    );
  });

  constructor() {
    toObservable(this.tokens.hasToken)
      .pipe(
        distinctUntilChanged(),
        filter((has) => has),
        switchMap(() => this.userApi.getMe().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((u) => {
        if (u) this.userProfile.setFromUser(u);
      });

    combineLatest([toObservable(this.monthCtx.selectedMonth), toObservable(this.tokens.hasToken)])
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a[0].year === b[0].year && a[0].month === b[0].month && a[1] === b[1]
        ),
        tap(([, has]) => {
          if (!has) {
            this.resetState();
          }
        }),
        filter(([, has]) => has),
        map(([ym]) => ym),
        switchMap(() => this.loadMonthPayload$()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((payload: { categories: Category[]; transactions: Transaction[] }) => {
        this._categories.set(payload.categories);
        this._transactions.set(payload.transactions);
      });
  }

  private loadMonthPayload$() {
    const { year, month } = this.monthCtx.selectedMonth();
    return forkJoin({
      categories: this.categoryApi.getAll().pipe(catchError(() => of([] as Category[]))),
      transactions: this.transactionApi
        .getByMonth(year, month)
        .pipe(catchError(() => of([] as Transaction[]))),
    });
  }

  reloadCurrentMonth(): void {
    this.loadMonthPayload$().pipe(take(1)).subscribe((payload) => {
      this._categories.set(payload.categories);
      this._transactions.set(payload.transactions);
    });
  }

  resetState(): void {
    this._categories.set([]);
    this._transactions.set([]);
  }

  categoriesByFlow(flow: Flow): Category[] {
    return this._categories().filter((c) => c.flow === flow);
  }

  incomeCategories(): Category[] {
    return this.categoriesByFlow('income');
  }

  expenseCategories(group?: 'essential' | 'nonEssential'): Category[] {
    const all = this.categoriesByFlow('expense');
    if (!group) return all;
    return all.filter((c) => c.expenseGroup === group);
  }

  investmentCategories(): Category[] {
    return this.categoriesByFlow('investment');
  }

  getCategory(id: number): Category | undefined {
    return this._categories().find((c) => c.id === id);
  }

  canDeleteCategory(id: number): boolean {
    return !this._transactions().some((t) => t.categoryId === id);
  }

  addCategory(dto: CategoryCreateDto) {
    return this.categoryApi.create(dto).pipe(
      tap((created) => this._categories.update((list) => [...list, created]))
    );
  }

  updateCategory(cat: Category) {
    const dto: CategoryCreateDto = {
      name: cat.name,
      flow: cat.flow,
      expenseGroup: cat.expenseGroup,
      openingBalanceAmount: cat.flow === 'investment' ? (cat.openingBalanceAmount ?? 0) : 0,
    };
    return this.categoryApi.update(cat.id, dto).pipe(
      tap((updated) =>
        this._categories.update((list) => list.map((c) => (c.id === updated.id ? updated : c)))
      )
    );
  }

  deleteCategory(id: number) {
    return this.categoryApi.delete(id).pipe(
      tap(() => {
        this._categories.update((list) => list.filter((c) => c.id !== id));
        this._transactions.update((list) => list.filter((t) => t.categoryId !== id));
      })
    );
  }

  addTransaction(dto: TransactionCreateDto) {
    return this.transactionApi.create(dto).pipe(
      tap((created) => this._transactions.update((list) => [...list, created]))
    );
  }

  createRecurrence(dto: RecurrenceCreateDto) {
    return this.recurrenceApi.create(dto).pipe(tap(() => this.reloadCurrentMonth()));
  }

  updateTransaction(t: Transaction, options?: { applyToFutureSeries?: boolean }) {
    const dto: TransactionCreateDto = {
      categoryId: t.categoryId,
      description: t.description,
      amount: t.amount,
      date: t.date,
      schedule: t.schedule,
    };
    return this.transactionApi
      .update(t.id, dto, options?.applyToFutureSeries === true)
      .pipe(tap(() => this.reloadCurrentMonth()));
  }

  deleteTransaction(id: number, options?: { applyToFutureSeries?: boolean }) {
    return this.transactionApi
      .delete(id, options?.applyToFutureSeries === true)
      .pipe(tap(() => this.reloadCurrentMonth()));
  }

  transactionsForCategoryInMonth(categoryId: number): Transaction[] {
    return this.monthTransactions().filter((t) => t.categoryId === categoryId);
  }

  categoryNameMap(): Map<number, string> {
    const m = new Map<number, string>();
    for (const c of this._categories()) {
      m.set(c.id, c.name);
    }
    return m;
  }

  expenseBreakdownForMonth(): { essential: number; nonEssential: number; income: number } {
    const t = this.monthTotals();
    return {
      income: t.totalIncome,
      essential: t.totalEssential,
      nonEssential: t.totalNonEssential,
    };
  }
}
