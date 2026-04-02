import { computed, Injectable, inject } from '@angular/core';
import { Category, Flow, MonthTotals, Transaction } from '../models/finances.models';
import { computeMonthTotals, filterTransactionsByMonth } from '../utils/finance-calculations';
import { FinancesStorageService } from './finances-storage.service';
import { MonthContextService } from './month-context.service';

@Injectable({ providedIn: 'root' })
export class FinancesFacadeService {
  private readonly store = inject(FinancesStorageService);
  private readonly monthCtx = inject(MonthContextService);

  readonly categories = this.store.categories;
  readonly transactions = this.store.transactions;

  readonly monthTransactions = computed(() => {
    const { year, month } = this.monthCtx.selectedMonth();
    return filterTransactionsByMonth(this.store.transactions(), year, month);
  });

  readonly monthTotals = computed((): MonthTotals => {
    const { year, month } = this.monthCtx.selectedMonth();
    return computeMonthTotals(
      {
        schemaVersion: 1,
        categories: this.store.categories(),
        transactions: this.store.transactions(),
      },
      year,
      month
    );
  });

  categoriesByFlow(flow: Flow): Category[] {
    return this.store.categories().filter((c) => c.flow === flow);
  }

  incomeCategories(): Category[] {
    return this.categoriesByFlow('income');
  }

  expenseCategories(group?: 'essential' | 'nonEssential'): Category[] {
    const all = this.categoriesByFlow('expense');
    if (!group) return all;
    return all.filter((c) => c.expenseGroup === group);
  }

  getCategory(id: string): Category | undefined {
    return this.store.categories().find((c) => c.id === id);
  }

  canDeleteCategory(id: string): boolean {
    return !this.store.hasTransactionsForCategory(id);
  }

  addCategory(cat: Category): void {
    this.store.addCategory(cat);
  }

  updateCategory(cat: Category): void {
    this.store.updateCategory(cat);
  }

  deleteCategory(id: string): void {
    this.store.deleteCategory(id);
  }

  addTransaction(t: Transaction): void {
    this.store.addTransaction(t);
  }

  updateTransaction(t: Transaction): void {
    this.store.updateTransaction(t);
  }

  deleteTransaction(id: string): void {
    this.store.deleteTransaction(id);
  }

  transactionsForCategoryInMonth(categoryId: string): Transaction[] {
    return this.monthTransactions().filter((t) => t.categoryId === categoryId);
  }

  categoryNameMap(): Map<string, string> {
    const m = new Map<string, string>();
    for (const c of this.store.categories()) {
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
