import { AppState } from '../models/finances.models';
import { computeMonthTotals, filterTransactionsByMonth, transactionInMonth } from './finance-calculations';

describe('finance-calculations', () => {
  const state: AppState = {
    schemaVersion: 1,
    categories: [
      { id: 1, name: 'Salário', flow: 'income' },
      { id: 2, name: 'Aluguel', flow: 'expense', expenseGroup: 'essential' },
      { id: 3, name: 'Lazer', flow: 'expense', expenseGroup: 'nonEssential' },
      { id: 4, name: 'Tesouro', flow: 'investment' },
    ],
    transactions: [
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
      {
        id: 104,
        categoryId: 4,
        description: 'Aporte',
        amount: 500,
        date: '2026-04-10',
        schedule: 'variable',
        flow: 'investment',
      },
    ],
  };

  it('transactionInMonth', () => {
    expect(transactionInMonth(state.transactions[0], 2026, 4)).toBe(true);
    expect(transactionInMonth(state.transactions[2], 2026, 4)).toBe(false);
  });

  it('filterTransactionsByMonth', () => {
    const m = filterTransactionsByMonth(state.transactions, 2026, 4);
    expect(m.length).toBe(3);
  });

  it('computeMonthTotals', () => {
    const t = computeMonthTotals(state, 2026, 4);
    expect(t.totalIncome).toBe(5000);
    expect(t.totalEssential).toBe(2000);
    expect(t.totalNonEssential).toBe(0);
    expect(t.totalExpenses).toBe(2000);
    expect(t.totalInvestments).toBe(500);
    expect(t.balance).toBe(2500);
  });

  it('computeMonthTotals subtracts investment resgates (negative amounts)', () => {
    const withResgate: AppState = {
      ...state,
      transactions: [
        ...state.transactions,
        {
          id: 105,
          categoryId: 4,
          description: 'Resgate parcial',
          amount: -200,
          date: '2026-04-20',
          schedule: 'variable',
          flow: 'investment',
        },
      ],
    };
    const t = computeMonthTotals(withResgate, 2026, 4);
    expect(t.totalInvestments).toBe(300);
    expect(t.balance).toBe(2700);
  });
});
