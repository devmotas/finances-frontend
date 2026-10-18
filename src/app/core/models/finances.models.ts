export type Flow = 'income' | 'expense' | 'investment';
export type ExpenseGroup = 'essential' | 'nonEssential';
export type Schedule = 'fixed' | 'variable';
export type SeriesKind = 'fixed' | 'installment';
export type InvestmentDirection = 'contribution' | 'withdrawal';

export const SERIES_KIND = {
  fixed: 'fixed',
  installment: 'installment',
} as const satisfies Record<SeriesKind, SeriesKind>;

export const INVESTMENT_DIRECTION = {
  contribution: 'contribution',
  withdrawal: 'withdrawal',
} as const satisfies Record<InvestmentDirection, InvestmentDirection>;

export interface Category {
  id: number;
  name: string;
  flow: Flow;
  expenseGroup?: ExpenseGroup;
  openingBalanceAmount?: number;
}

export interface Transaction {
  id: number;
  categoryId: number;
  description: string;
  amount: number;
  date: string;
  schedule: Schedule;
  flow: Flow;
  recurrenceId?: number | null;
  recurrenceIndex?: number | null;
  investmentAccountId?: number | null;
  direction?: InvestmentDirection | null;
  seriesKind?: SeriesKind | null;
  seriesEndsOn?: string | null;
  installmentTotal?: number | null;
  destinationAccountId?: number | null;
}

export interface CategoryCreateDto {
  name: string;
  flow: Flow;
  expenseGroup?: ExpenseGroup;
  openingBalanceAmount?: number;
}

export interface TransactionCreateDto {
  categoryId?: number;
  investmentAccountId?: number;
  direction?: InvestmentDirection;
  description?: string | null;
  amount: number;
  date: string;
  schedule?: Schedule;
}

export interface TransactionRestoreDto {
  categoryId: number | null;
  investmentAccountId: number | null;
  direction: InvestmentDirection | null;
  description: string | null;
  amount: number;
  date: string;
  recurrenceId: number | null;
  recurrenceIndex: number | null;
}

export interface ClosedSeries {
  recurrenceId: number;
  previousEndMonth: string | null;
}

export interface SeriesReopenDto {
  recurrenceId: number;
  endMonth: string | null;
}

export interface TransactionDeletionResult {
  deleted: Transaction[];
  closedSeries: ClosedSeries[];
}

export interface MonthTotals {
  totalIncome: number;
  totalEssential: number;
  totalNonEssential: number;
  totalExpenses: number;
  totalInvestments: number;
  balance: number;
}
