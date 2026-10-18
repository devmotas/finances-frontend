import { EmergencyReserve } from '../../core/models/investment-accounts.models';
import { coverageProgress, reserveAccountsAmount, shortTermIsBelowTarget } from './reserve-progress';

function reserve(overrides: Partial<EmergencyReserve> = {}): EmergencyReserve {
  return {
    amount: 30000,
    referenceExpense: 1000,
    coverageMonths: 3,
    targetMonths: 6,
    shortTermBalance: 1500,
    shortTermTarget: 2000,
    shortTermMissing: 500,
    ...overrides,
  };
}

describe('reserve-progress', () => {
  it('mostra a porcentagem da meta', () => {
    expect(coverageProgress(reserve())).toEqual({ percent: 50, barPercent: 50, reached: false });
  });

  it('limita a barra a 100% mas mantém o número real', () => {
    expect(coverageProgress(reserve({ coverageMonths: 27 }))).toEqual({
      percent: 450,
      barPercent: 100,
      reached: true,
    });
  });

  it('não calcula progresso sem cobertura', () => {
    expect(coverageProgress(reserve({ coverageMonths: null }))).toBeNull();
  });

  it('separa as contas de reserva da reserva de curto prazo', () => {
    expect(reserveAccountsAmount(reserve())).toBe(28500);
  });

  it('avisa só quando falta devolver para a reserva de curto prazo', () => {
    expect(shortTermIsBelowTarget(reserve())).toBeTrue();
    expect(shortTermIsBelowTarget(reserve({ shortTermMissing: 0 }))).toBeFalse();
    expect(shortTermIsBelowTarget(reserve({ shortTermMissing: null }))).toBeFalse();
  });
});
