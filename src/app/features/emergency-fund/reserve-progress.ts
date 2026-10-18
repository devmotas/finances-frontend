import { EmergencyReserve } from '../../core/models/investment-accounts.models';

const FULL_PERCENT = 100;
const CENTS_FACTOR = 100;

export interface CoverageProgress {
  percent: number;
  barPercent: number;
  reached: boolean;
}

function roundCents(value: number): number {
  return Math.round(value * CENTS_FACTOR) / CENTS_FACTOR;
}

export function coverageProgress(reserve: EmergencyReserve): CoverageProgress | null {
  const { coverageMonths, targetMonths } = reserve;
  if (coverageMonths === null || targetMonths <= 0) return null;
  const percent = Math.round((coverageMonths / targetMonths) * FULL_PERCENT);
  return {
    percent,
    barPercent: Math.min(FULL_PERCENT, Math.max(0, percent)),
    reached: coverageMonths >= targetMonths,
  };
}

export function reserveAccountsAmount(reserve: EmergencyReserve): number {
  return roundCents(reserve.amount - reserve.shortTermBalance);
}

export function shortTermIsBelowTarget(reserve: EmergencyReserve): boolean {
  return (reserve.shortTermMissing ?? 0) > 0;
}
