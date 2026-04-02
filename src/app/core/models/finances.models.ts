export type Flow = 'income' | 'expense';
export type ExpenseGroup = 'essential' | 'nonEssential';
export type Schedule = 'fixed' | 'variable';

export interface Category {
  id: string;
  name: string;
  flow: Flow;
  expenseGroup?: ExpenseGroup;
}

export interface Transaction {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  date: string;
  schedule: Schedule;
  flow: Flow;
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
  balance: number;
}
