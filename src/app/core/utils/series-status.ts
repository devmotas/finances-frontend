import { SERIES_KIND, Transaction } from '../models/finances.models';
import { isSeriesTransaction } from './transaction-series';

export const SERIES_ENDING_WINDOW_MONTHS = 2;

const MONTHS_PER_YEAR = 12;
const LOCALE = 'pt-BR';
const SHORT_MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'short' };
const ABBREVIATION_DOT = '.';
const INSTALLMENT_PREFIX = /^Parcela \d+ de \d+(: )?/;

export const SERIES_BADGE = {
  fixed: 'Fixo',
  single: 'Este mês',
  lastInstallment: 'Última parcela',
} as const;

interface YearMonthParts {
  readonly year: number;
  readonly month: number;
}

export interface InstallmentPosition {
  readonly index: number;
  readonly total: number;
}

function parseYearMonth(text: string): YearMonthParts {
  const [year, month] = text.split('-').map(Number);
  return { year, month };
}

function monthsBetween(from: YearMonthParts, to: YearMonthParts): number {
  return (to.year - from.year) * MONTHS_PER_YEAR + (to.month - from.month);
}

function monthsUntil(t: Transaction, endsOn: string): number {
  return monthsBetween(parseYearMonth(t.date), parseYearMonth(endsOn));
}

function monthsUntilSeriesEnd(t: Transaction): number | null {
  return t.seriesEndsOn ? monthsUntil(t, t.seriesEndsOn) : null;
}

function isInstallment(t: Transaction): boolean {
  return t.seriesKind === SERIES_KIND.installment;
}

export function shortMonthYearLabel(yearMonth: string): string {
  const { year, month } = parseYearMonth(yearMonth);
  const monthName = new Date(year, month - 1, 1)
    .toLocaleDateString(LOCALE, SHORT_MONTH_FORMAT)
    .replace(ABBREVIATION_DOT, '');
  return `${monthName}/${year}`;
}

export function installmentPosition(t: Transaction): InstallmentPosition | null {
  const remaining = monthsUntilSeriesEnd(t);
  if (!isInstallment(t) || t.recurrenceIndex == null || remaining === null) return null;
  return { index: t.recurrenceIndex, total: t.installmentTotal ?? t.recurrenceIndex + remaining };
}

export function seriesKindLabel(t: Transaction): string {
  const position = installmentPosition(t);
  if (position) return `Parcela ${position.index} de ${position.total}`;
  return isSeriesTransaction(t) ? SERIES_BADGE.fixed : SERIES_BADGE.single;
}

export function seriesEndingNotice(t: Transaction): string | null {
  const endsOn = t.seriesEndsOn;
  if (!endsOn) return null;
  const remaining = monthsUntil(t, endsOn);
  if (remaining < 0) return null;
  if (isInstallment(t)) return remaining === 0 ? SERIES_BADGE.lastInstallment : null;
  if (remaining > SERIES_ENDING_WINDOW_MONTHS) return null;
  return `Termina em ${shortMonthYearLabel(endsOn)}`;
}

export function descriptionWithoutInstallmentPrefix(description: string): string {
  return description.replace(INSTALLMENT_PREFIX, '').trim();
}
