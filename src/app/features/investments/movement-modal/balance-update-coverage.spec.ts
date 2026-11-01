import { coveredByBalanceUpdate } from './balance-update-coverage';

describe('coveredByBalanceUpdate', () => {
  const update = { date: '2026-11-20', balance: 2250 };

  it('data anterior à última atualização de saldo fica coberta por ela', () => {
    expect(coveredByBalanceUpdate('2026-11-01', update)).toBeTrue();
  });

  it('no mesmo dia ou depois, o lançamento muda o saldo', () => {
    expect(coveredByBalanceUpdate('2026-11-20', update)).toBeFalse();
    expect(coveredByBalanceUpdate('2026-11-21', update)).toBeFalse();
  });

  it('sem atualização de saldo ou sem data, não avisa', () => {
    expect(coveredByBalanceUpdate('2026-11-01', null)).toBeFalse();
    expect(coveredByBalanceUpdate('', update)).toBeFalse();
  });
});
