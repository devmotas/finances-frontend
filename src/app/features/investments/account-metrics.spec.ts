import { ACCOUNT_ROLE, InvestmentMonthAccount } from '../../core/models/investment-accounts.models';
import { accountMonthNet, hasMissingToTarget } from './account-metrics';

function account(overrides: Partial<InvestmentMonthAccount> = {}): InvestmentMonthAccount {
  return {
    id: 20,
    name: 'Reserva',
    role: ACCOUNT_ROLE.reserve,
    initialBalance: 1000,
    initialBalanceDate: '2026-01-01',
    targetBalance: null,
    contributions: 500,
    withdrawals: 0,
    yield: 30,
    balance: 1530,
    missingToTarget: null,
    lastBalanceUpdate: null,
    monthContributions: 200,
    monthWithdrawals: 50,
    monthYield: 20,
    ...overrides,
  };
}

describe('account-metrics', () => {
  it('calcula aportes menos resgates do mês da conta', () => {
    expect(accountMonthNet(account())).toBe(150);
  });

  it('avisa só quando falta valor para completar o valor-alvo', () => {
    expect(hasMissingToTarget(account({ missingToTarget: 120 }))).toBeTrue();
    expect(hasMissingToTarget(account({ missingToTarget: 0 }))).toBeFalse();
    expect(hasMissingToTarget(account({ missingToTarget: null }))).toBeFalse();
  });
});
