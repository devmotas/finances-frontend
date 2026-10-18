import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { YearMonth } from '../../../core/services/month-context.service';
import { parseBrlToNumber } from '../../../core/utils/brl-parse';

const DATE_PART_LENGTH = 2;
const DATE_PAD = '0';
const FIRST_DAY = 1;
const DATE_SEPARATOR = '-';
const DISPLAY_DATE_SEPARATOR = '/';

export const AMOUNT_ERROR = 'amount';

function isoDate(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(DATE_PART_LENGTH, DATE_PAD);
  return [year, pad(month), pad(day)].join(DATE_SEPARATOR);
}

export function todayIso(now = new Date()): string {
  return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isCurrentMonth(selected: YearMonth, now: Date): boolean {
  return selected.year === now.getFullYear() && selected.month === now.getMonth() + 1;
}

function lastDayOf(selected: YearMonth): number {
  return new Date(selected.year, selected.month, 0).getDate();
}

export function defaultDateForMonth(selected: YearMonth, now = new Date()): string {
  return isCurrentMonth(selected, now) ? todayIso(now) : isoDate(selected.year, selected.month, FIRST_DAY);
}

export function defaultBalanceUpdateDate(selected: YearMonth, now = new Date()): string {
  return isCurrentMonth(selected, now)
    ? todayIso(now)
    : isoDate(selected.year, selected.month, lastDayOf(selected));
}

export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split(DATE_SEPARATOR);
  return [day, month, year].join(DISPLAY_DATE_SEPARATOR);
}

export function parseAmount(raw: unknown): number | null {
  return parseBrlToNumber(String(raw ?? ''));
}

export function amountValidator(options: { allowZero: boolean }): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = parseAmount(control.value);
    const valid = value !== null && (options.allowZero ? value >= 0 : value > 0);
    return valid ? null : { [AMOUNT_ERROR]: true };
  };
}
