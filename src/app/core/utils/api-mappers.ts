import {
  Category,
  ExpenseGroup,
  Flow,
  INVESTMENT_DIRECTION,
  InvestmentDirection,
  Schedule,
  SERIES_KIND,
  SeriesKind,
  Transaction,
} from '../models/finances.models';

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
  investmentAccountId?: number | null;
  direction?: string | null;
  seriesKind?: string | null;
  seriesEndsOn?: string | null;
  installmentTotal?: number | null;
  destinationAccountId?: number | null;
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

function asSeriesKind(v: string | null | undefined): SeriesKind | null {
  if (v === SERIES_KIND.fixed || v === SERIES_KIND.installment) return v;
  return null;
}

function asDirection(v: string | null | undefined): InvestmentDirection | null {
  if (v === INVESTMENT_DIRECTION.contribution || v === INVESTMENT_DIRECTION.withdrawal) return v;
  return null;
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
    investmentAccountId: row.investmentAccountId ?? null,
    direction: asDirection(row.direction),
    seriesKind: asSeriesKind(row.seriesKind),
    seriesEndsOn: row.seriesEndsOn ?? null,
    installmentTotal: row.installmentTotal ?? null,
    destinationAccountId: row.destinationAccountId ?? null,
  };
}
