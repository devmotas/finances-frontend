import { BalanceUpdateDto, WALLET_ADJUSTMENT_FLOW } from '../../../core/models/investment-accounts.models';
import { formatBrl } from '../../../core/utils/brl-format';
import { balanceUpdatedMessage } from './balance-update-message';

function update(overrides: Partial<BalanceUpdateDto> = {}): BalanceUpdateDto {
  return { id: 1, investmentAccountId: 30, date: '2026-10-31', balance: 200, yield: 0, ...overrides };
}

describe('balance-update-message', () => {
  it('mostra o rendimento nas contas de investimento', () => {
    expect(balanceUpdatedMessage(update({ yield: 12.5 }), false)).toBe(
      `Saldo atualizado. Rendimento até essa data: ${formatBrl(12.5)}.`
    );
  });

  it('mostra os gastos da carteira quando o saldo real é menor', () => {
    const adjustment = { transactionId: 9, flow: WALLET_ADJUSTMENT_FLOW.expense, amount: 191.66 };
    expect(balanceUpdatedMessage(update({ walletAdjustment: adjustment }), true)).toBe(
      `Gastos da carteira registrados: ${formatBrl(191.66)}`
    );
  });

  it('mostra a entrada na carteira quando o saldo real é maior', () => {
    const adjustment = { transactionId: 9, flow: WALLET_ADJUSTMENT_FLOW.income, amount: 20 };
    expect(balanceUpdatedMessage(update({ walletAdjustment: adjustment }), true)).toBe(
      `Entrada na carteira registrada: ${formatBrl(20)}`
    );
  });

  it('avisa que o saldo confere quando não há diferença', () => {
    expect(balanceUpdatedMessage(update({ walletAdjustment: null }), true)).toBe('Saldo da carteira confere.');
  });
});
