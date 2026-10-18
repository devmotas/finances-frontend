import { FormControl } from '@angular/forms';
import {
  AMOUNT_ERROR,
  amountValidator,
  defaultBalanceUpdateDate,
  defaultDateForMonth,
  formatIsoDate,
} from './investment-form';

describe('investment-form', () => {
  const now = new Date(2026, 9, 18);

  it('sugere hoje no mês do calendário e o dia 1 nos outros meses', () => {
    expect(defaultDateForMonth({ year: 2026, month: 10 }, now)).toBe('2026-10-18');
    expect(defaultDateForMonth({ year: 2026, month: 2 }, now)).toBe('2026-02-01');
  });

  it('sugere o último dia do mês para atualizar saldo de um mês passado', () => {
    expect(defaultBalanceUpdateDate({ year: 2026, month: 2 }, now)).toBe('2026-02-28');
    expect(defaultBalanceUpdateDate({ year: 2026, month: 10 }, now)).toBe('2026-10-18');
  });

  it('formata a data ISO para dd/mm/aaaa sem fuso', () => {
    expect(formatIsoDate('2026-10-01')).toBe('01/10/2026');
  });

  it('aceita só valores positivos quando zero não é permitido', () => {
    const positive = amountValidator({ allowZero: false });
    expect(positive(new FormControl('1.250,50'))).toBeNull();
    expect(positive(new FormControl('0'))).toEqual({ [AMOUNT_ERROR]: true });
    expect(positive(new FormControl('-10'))).toEqual({ [AMOUNT_ERROR]: true });
  });

  it('aceita zero quando permitido', () => {
    expect(amountValidator({ allowZero: true })(new FormControl('0'))).toBeNull();
  });
});
