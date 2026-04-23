import { Category, ExpenseGroup, Flow, Schedule, Transaction } from '../models/finances.models';

export interface CategoryApiDto {
  id: number;
  name: string;
  flow: string;
  expenseGroup: string | null;
  openingBalanceAmount?: number | string | null;
}

export interface TransactionApiDto {
  id: number;
  categoryId: number;
  description: string | null;
  amount: number | string;
  date: string | number[] | unknown;
  schedule: string;
  flow: string;
  recurrenceId?: number | null;
  recurrenceIndex?: number | null;
}

export function normalizeApiDate(value: unknown): string {
  if (typeof value === 'string') {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const y = Number(value[0]);
    const m = Number(value[1]);
    const d = Number(value[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return '';
}

function asFlow(v: string): Flow {
  if (v === 'expense') return 'expense';
  if (v === 'investment') return 'investment';
  return 'income';
}

function asExpenseGroup(v: string | null | undefined): ExpenseGroup | undefined {
  if (v === 'essential' || v === 'nonEssential') return v;
  return undefined;
}

function asSchedule(v: string): Schedule {
  return v === 'fixed' ? 'fixed' : 'variable';
}

function asMoney(v: number | string | null | undefined): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function mapCategoryApiDto(row: CategoryApiDto): Category {
  const opening = asMoney(row.openingBalanceAmount);
  return {
    id: row.id,
    name: row.name,
    flow: asFlow(row.flow),
    expenseGroup: asExpenseGroup(row.expenseGroup),
    openingBalanceAmount: opening ?? 0,
  };
}

export function mapTransactionApiDto(row: TransactionApiDto): Transaction {
  const amount =
    typeof row.amount === 'number' ? row.amount : Number(String(row.amount).replace(',', '.'));
  const rid = row.recurrenceId;
  const ridx = row.recurrenceIndex;
  return {
    id: row.id,
    categoryId: row.categoryId,
    description: (row.description ?? '').trim(),
    amount: Number.isFinite(amount) ? amount : 0,
    date: normalizeApiDate(row.date),
    schedule: asSchedule(row.schedule),
    flow: asFlow(row.flow),
    recurrenceId: typeof rid === 'number' && Number.isFinite(rid) ? rid : null,
    recurrenceIndex: typeof ridx === 'number' && Number.isFinite(ridx) ? ridx : null,
  };
}
