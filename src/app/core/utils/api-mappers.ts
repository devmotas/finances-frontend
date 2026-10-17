import { Category, ExpenseGroup, Flow, Schedule, Transaction } from '../models/finances.models';

export interface CategoryApiDto {
  id: number;
  name: string;
  flow: string;
  expenseGroup: string | null;
  openingBalanceAmount: number | null;
}

export interface TransactionApiDto {
  id: number;
  categoryId: number;
  description: string | null;
  amount: number;
  date: string;
  schedule: string;
  flow: string;
  recurrenceId: number | null;
  recurrenceIndex: number | null;
}

function asFlow(v: string): Flow {
  if (v === 'expense') return 'expense';
  if (v === 'investment') return 'investment';
  return 'income';
}

function asExpenseGroup(v: string | null): ExpenseGroup | undefined {
  if (v === 'essential' || v === 'nonEssential') return v;
  return undefined;
}

function asSchedule(v: string): Schedule {
  return v === 'fixed' ? 'fixed' : 'variable';
}

export function mapCategoryApiDto(row: CategoryApiDto): Category {
  return {
    id: row.id,
    name: row.name,
    flow: asFlow(row.flow),
    expenseGroup: asExpenseGroup(row.expenseGroup),
    openingBalanceAmount: row.openingBalanceAmount ?? 0,
  };
}

export function mapTransactionApiDto(row: TransactionApiDto): Transaction {
  return {
    id: row.id,
    categoryId: row.categoryId,
    description: (row.description ?? '').trim(),
    amount: row.amount,
    date: row.date,
    schedule: asSchedule(row.schedule),
    flow: asFlow(row.flow),
    recurrenceId: row.recurrenceId,
    recurrenceIndex: row.recurrenceIndex,
  };
}
