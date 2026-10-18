import { InvestmentMonthAccount } from '../../core/models/investment-accounts.models';

const CENTS_FACTOR = 100;

function roundCents(value: number): number {
  return Math.round(value * CENTS_FACTOR) / CENTS_FACTOR;
}

export function accountMonthNet(account: InvestmentMonthAccount): number {
  return roundCents(account.monthContributions - account.monthWithdrawals);
}

export function hasMissingToTarget(account: InvestmentMonthAccount): boolean {
  return (account.missingToTarget ?? 0) > 0;
}
