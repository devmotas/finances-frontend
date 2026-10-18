import { Transaction } from '../models/finances.models';
import { FinanceSummaryDto } from '../services/finance-summary-api.service';
import {
  EMPTY_MONTH_TOTALS,
  filterTransactionsByMonth,
  isWithdrawal,
  monthTotalsFromSummary,
  signedInvestmentAmount,
  transactionInMonth,
} from './finance-calculations';

describe('finance-calculations', () => {
  const transactions: Transaction[] = [
    {
      id: 101,
      categoryId: 1,
      description: 'Sal',
      amount: 5000,
      date: '2026-04-15',
      schedule: 'fixed',
      flow: 'income',
    },
    {
      id: 102,
      categoryId: 2,
      description: 'Aluguel',
      amount: 2000,
      date: '2026-04-01',
      schedule: 'fixed',
      flow: 'expense',
    },
    {
      id: 103,
      categoryId: 3,
      description: 'Cinema',
      amount: 100,
      date: '2026-03-30',
      schedule: 'variable',
      flow: 'expense',
    },
  ];

  it('transactionInMonth', () => {
    expect(transactionInMonth(transactions[0], 2026, 4)).toBe(true);
    expect(transactionInMonth(transactions[2], 2026, 4)).toBe(false);
  });

  it('filterTransactionsByMonth', () => {
    expect(filterTransactionsByMonth(transactions, 2026, 4).length).toBe(2);
  });

  describe('aporte e resgate', () => {
    it('resgate vem com valor positivo e direção', () => {
      const resgate = { amount: 200, direction: 'withdrawal' as const };

      expect(isWithdrawal(resgate)).toBeTrue();
      expect(signedInvestmentAmount(resgate)).toBe(-200);
    });

    it('aporte soma no investimento líquido', () => {
      const aporte = { amount: 500, direction: 'contribution' as const };

      expect(isWithdrawal(aporte)).toBeFalse();
      expect(signedInvestmentAmount(aporte)).toBe(500);
    });

    it('lançamento antigo sem direção usa o sinal do valor', () => {
      expect(signedInvestmentAmount({ amount: -300, direction: null })).toBe(-300);
      expect(signedInvestmentAmount({ amount: 300 })).toBe(300);
    });
  });

  describe('monthTotalsFromSummary', () => {
    it('usa o resumo do backend como fonte única dos totais', () => {
      const summary = {
        totalIncome: 4989.98,
        totalEssential: 1229,
        totalNonEssential: 3760.15,
        totalExpenses: 4989.15,
        netInvested: -150,
        monthBalance: 150.83,
      } as FinanceSummaryDto;

      expect(monthTotalsFromSummary(summary)).toEqual({
        totalIncome: 4989.98,
        totalEssential: 1229,
        totalNonEssential: 3760.15,
        totalExpenses: 4989.15,
        totalInvestments: -150,
        balance: 150.83,
      });
    });

    it('sem resumo devolve totais zerados', () => {
      expect(monthTotalsFromSummary(null)).toEqual(EMPTY_MONTH_TOTALS);
    });
  });
});
