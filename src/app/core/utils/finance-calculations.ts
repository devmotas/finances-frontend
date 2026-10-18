import {
  Category,
  INVESTMENT_DIRECTION,
  MonthTotals,
  Transaction,
} from '../models/finances.models';
import { FinanceSummaryDto } from '../services/finance-summary-api.service';

export const EMPTY_MONTH_TOTALS: Readonly<MonthTotals> = {
  totalIncome: 0,
  totalEssential: 0,
  totalNonEssential: 0,
  totalExpenses: 0,
  totalInvestments: 0,
  balance: 0,
};

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

export function categoryMap(categories: Category[]): Map<number, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function isWithdrawal(t: Pick<Transaction, 'amount' | 'direction'>): boolean {
  if (t.direction) return t.direction === INVESTMENT_DIRECTION.withdrawal;
  return t.amount < 0;
}

export function signedInvestmentAmount(t: Pick<Transaction, 'amount' | 'direction'>): number {
  const magnitude = Math.abs(t.amount);
  return isWithdrawal(t) ? -magnitude : magnitude;
}

export function monthTotalsFromSummary(summary: FinanceSummaryDto | null): MonthTotals {
  if (!summary) return { ...EMPTY_MONTH_TOTALS };
  return {
    totalIncome: summary.totalIncome,
    totalEssential: summary.totalEssential,
    totalNonEssential: summary.totalNonEssential,
    totalExpenses: summary.totalExpenses,
    totalInvestments: summary.netInvested,
    balance: summary.monthBalance,
  };
}
