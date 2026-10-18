import { Transaction } from '../models/finances.models';
import { mapTransactionApiDto, TransactionApiDto } from './api-mappers';
import { isWalletTransaction } from './transaction-series';

const WALLET_ACCOUNT_ID = 30;

function apiRow(overrides: Partial<TransactionApiDto> = {}): TransactionApiDto {
  return {
    id: 1,
    categoryId: 5,
    description: null,
    amount: 191.66,
    date: '2026-10-31',
    schedule: 'variable',
    flow: 'expense',
    recurrenceId: null,
    recurrenceIndex: null,
    ...overrides,
  };
}

describe('transaction-series', () => {
  it('marca como da carteira o lançamento gerado pela atualização de saldo', () => {
    const tx: Transaction = mapTransactionApiDto(apiRow({ walletAccountId: WALLET_ACCOUNT_ID }));
    expect(tx.walletAccountId).toBe(WALLET_ACCOUNT_ID);
    expect(isWalletTransaction(tx)).toBeTrue();
  });

  it('lançamento comum não é da carteira', () => {
    expect(isWalletTransaction(mapTransactionApiDto(apiRow()))).toBeFalse();
  });
});
