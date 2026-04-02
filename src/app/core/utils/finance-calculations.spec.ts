import { AppState } from '../models/finances.models';
import { computeMonthTotals, filterTransactionsByMonth, transactionInMonth } from './finance-calculations';

describe('finance-calculations', () => {
  const state: AppState = {
    schemaVersion: 1,
    categories: [
      { id: 'c1', name: 'Salário', flow: 'income' },
      { id: 'e1', name: 'Aluguel', flow: 'expense', expenseGroup: 'essential' },
      { id: 'e2', name: 'Lazer', flow: 'expense', expenseGroup: 'nonEssential' },
    ],
    transactions: [
      {
        id: 't1',
        categoryId: 'c1',
        description: 'Sal',
        amount: 5000,
        date: '2026-04-15',
        schedule: 'fixed',
        flow: 'income',
      },
      {
        id: 't2',
        categoryId: 'e1',
        description: 'Aluguel',
        amount: 2000,
        date: '2026-04-01',
        schedule: 'fixed',
        flow: 'expense',
      },
      {
        id: 't3',
        categoryId: 'e2',
        description: 'Cinema',
        amount: 100,
        date: '2026-03-30',
        schedule: 'variable',
        flow: 'expense',
      },
    ],
  };

  it('transactionInMonth', () => {
    expect(transactionInMonth(state.transactions[0], 2026, 4)).toBe(true);
    expect(transactionInMonth(state.transactions[2], 2026, 4)).toBe(false);
  });

  it('filterTransactionsByMonth', () => {
    const m = filterTransactionsByMonth(state.transactions, 2026, 4);
    expect(m.length).toBe(2);
  });

  it('computeMonthTotals', () => {
    const t = computeMonthTotals(state, 2026, 4);
    expect(t.totalIncome).toBe(5000);
    expect(t.totalEssential).toBe(2000);
    expect(t.totalNonEssential).toBe(0);
    expect(t.totalExpenses).toBe(2000);
    expect(t.balance).toBe(3000);
  });
});
