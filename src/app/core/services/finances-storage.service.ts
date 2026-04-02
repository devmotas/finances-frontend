import { computed, Injectable, signal } from '@angular/core';
import { DEFAULT_CATEGORIES } from '../data/category-seed';
import { AppState, Category, Transaction } from '../models/finances.models';

const STORAGE_KEY = 'finances-app-v1';
const SCHEMA_VERSION = 1;

function emptyState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [...DEFAULT_CATEGORIES],
    transactions: [],
  };
}

@Injectable({ providedIn: 'root' })
export class FinancesStorageService {
  private readonly state = signal<AppState>(this.loadInitial());

  readonly categories = computed(() => this.state().categories);
  readonly transactions = computed(() => this.state().transactions);

  private loadInitial(): AppState {
    if (typeof localStorage === 'undefined') {
      return emptyState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    try {
      const parsed = JSON.parse(raw) as AppState;
      if (!parsed || typeof parsed !== 'object') return emptyState();
      if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        return { ...parsed, categories: [...DEFAULT_CATEGORIES], schemaVersion: SCHEMA_VERSION };
      }
      return {
        schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
        categories: parsed.categories,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      };
    } catch {
      return emptyState();
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private update(reducer: (s: AppState) => AppState): void {
    this.state.update(reducer);
    this.persist();
  }

  addCategory(cat: Category): void {
    this.update((s) => ({ ...s, categories: [...s.categories, cat] }));
  }

  updateCategory(cat: Category): void {
    this.update((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === cat.id ? cat : c)),
    }));
  }

  deleteCategory(id: string): void {
    this.update((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
    }));
  }

  addTransaction(t: Transaction): void {
    this.update((s) => ({ ...s, transactions: [...s.transactions, t] }));
  }

  updateTransaction(t: Transaction): void {
    this.update((s) => ({
      ...s,
      transactions: s.transactions.map((x) => (x.id === t.id ? t : x)),
    }));
  }

  deleteTransaction(id: string): void {
    this.update((s) => ({
      ...s,
      transactions: s.transactions.filter((x) => x.id !== id),
    }));
  }

  hasTransactionsForCategory(categoryId: string): boolean {
    return this.state().transactions.some((t) => t.categoryId === categoryId);
  }
}
