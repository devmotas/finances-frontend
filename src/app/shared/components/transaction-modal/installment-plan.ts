import { formatBrl } from '../../../core/utils/brl-format';

const CENTS_PER_UNIT = 100;
const MULTIPLY_SIGN = '×';

export interface InstallmentPlan {
  readonly count: number;
  readonly installmentAmount: number;
  readonly firstInstallmentAmount: number;
  readonly total: number;
}

function toCents(value: number): number {
  return Math.round(value * CENTS_PER_UNIT);
}

function fromCents(cents: number): number {
  return cents / CENTS_PER_UNIT;
}

export function planFromInstallmentAmount(amount: number, count: number): InstallmentPlan {
  const cents = toCents(amount);
  return {
    count,
    installmentAmount: fromCents(cents),
    firstInstallmentAmount: fromCents(cents),
    total: fromCents(cents * count),
  };
}

export function planFromTotal(total: number, count: number): InstallmentPlan | null {
  const totalCents = toCents(total);
  const baseCents = Math.floor(totalCents / count);
  if (baseCents <= 0) return null;
  return {
    count,
    installmentAmount: fromCents(baseCents),
    firstInstallmentAmount: fromCents(totalCents - baseCents * (count - 1)),
    total: fromCents(totalCents),
  };
}

export function installmentPreview(plan: InstallmentPlan): string {
  const parts = [`${plan.count} ${MULTIPLY_SIGN} ${formatBrl(plan.installmentAmount)}`];
  if (plan.firstInstallmentAmount !== plan.installmentAmount) {
    parts.push(`(1ª parcela ${formatBrl(plan.firstInstallmentAmount)})`);
  }
  parts.push(`= ${formatBrl(plan.total)}`);
  return parts.join(' ');
}
