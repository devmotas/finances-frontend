import { formatBrl } from '../../../core/utils/brl-format';
import {
  BalanceUpdateDto,
  WALLET_ADJUSTMENT_FLOW,
  WalletAdjustment,
} from '../../../core/models/investment-accounts.models';

const WALLET_MATCHES = 'Saldo da carteira confere.';

const WALLET_ADJUSTMENT_PREFIX = {
  [WALLET_ADJUSTMENT_FLOW.expense]: 'Gastos da carteira registrados',
  [WALLET_ADJUSTMENT_FLOW.income]: 'Entrada na carteira registrada',
} as const;

export function investmentBalanceMessage(update: BalanceUpdateDto): string {
  return `Saldo atualizado. Rendimento até essa data: ${formatBrl(update.yield)}.`;
}

export function walletBalanceMessage(adjustment: WalletAdjustment | null | undefined): string {
  if (!adjustment) return WALLET_MATCHES;
  return `${WALLET_ADJUSTMENT_PREFIX[adjustment.flow]}: ${formatBrl(adjustment.amount)}`;
}

export function balanceUpdatedMessage(update: BalanceUpdateDto, wallet: boolean): string {
  return wallet ? walletBalanceMessage(update.walletAdjustment) : investmentBalanceMessage(update);
}
