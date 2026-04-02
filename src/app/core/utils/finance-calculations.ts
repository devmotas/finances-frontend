import {
  AppState,
  Category,
  MonthTotals,
  Transaction,
} from '../models/finances.models';

export function transactionInMonth(t: Transaction, year: number, month: number): boolean {
  const d = parseISODate(t.date);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function parseISODate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function filterTransactionsByMonth(
  transactions: Transaction[],
  year: number,
  month: number
): Transaction[] {
  return transactions.filter((t) => transactionInMonth(t, year, month));
}

export function categoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function computeMonthTotals(
  state: AppState,
  year: number,
  month: number
): MonthTotals {
  const { categories, transactions } = state;
  const cats = categoryMap(categories);
  const monthTx = filterTransactionsByMonth(transactions, year, month);

  let totalIncome = 0;
  let totalEssential = 0;
  let totalNonEssential = 0;

  for (const t of monthTx) {
    if (t.flow === 'income') {
      totalIncome += t.amount;
      continue;
    }
    const cat = cats.get(t.categoryId);
    if (!cat || cat.flow !== 'expense') continue;
    if (cat.expenseGroup === 'essential') totalEssential += t.amount;
    else if (cat.expenseGroup === 'nonEssential') totalNonEssential += t.amount;
  }

  const totalExpenses = totalEssential + totalNonEssential;
  const balance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalEssential,
    totalNonEssential,
    totalExpenses,
    balance,
  };
}
