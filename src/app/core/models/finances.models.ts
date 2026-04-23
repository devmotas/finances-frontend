export type Flow = 'income' | 'expense' | 'investment';
export type ExpenseGroup = 'essential' | 'nonEssential';
export type Schedule = 'fixed' | 'variable';

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
}

export interface CategoryCreateDto {
  name: string;
  flow: Flow;
  expenseGroup?: ExpenseGroup;
  openingBalanceAmount?: number;
}

export interface TransactionCreateDto {
  categoryId: number;
  description?: string | null;
  amount: number;
  date: string;
  schedule: Schedule;
}

export interface AppState {
  schemaVersion: number;
  categories: Category[];
  transactions: Transaction[];
}

export interface MonthTotals {
  totalIncome: number;
  totalEssential: number;
  totalNonEssential: number;
  totalExpenses: number;
  totalInvestments: number;
  balance: number;
}
