import { formatBrl } from '../../../core/utils/brl-format';
import { installmentPreview, planFromInstallmentAmount, planFromTotal } from './installment-plan';

describe('installment-plan', () => {
  it('pelo valor da parcela multiplica para o total', () => {
    const plan = planFromInstallmentAmount(250, 10);

    expect(plan).toEqual({ count: 10, installmentAmount: 250, firstInstallmentAmount: 250, total: 2500 });
    expect(installmentPreview(plan)).toBe(`10 × ${formatBrl(250)} = ${formatBrl(2500)}`);
  });

  it('pelo valor total divide igualmente e põe os centavos que sobram na 1ª parcela', () => {
    const plan = planFromTotal(100, 3);

    expect(plan).toEqual({ count: 3, installmentAmount: 33.33, firstInstallmentAmount: 33.34, total: 100 });
    expect(installmentPreview(plan!)).toBe(
      `3 × ${formatBrl(33.33)} (1ª parcela ${formatBrl(33.34)}) = ${formatBrl(100)}`
    );
  });

  it('total exato não mostra 1ª parcela diferente', () => {
    expect(installmentPreview(planFromTotal(300, 3)!)).toBe(`3 × ${formatBrl(100)} = ${formatBrl(300)}`);
  });

  it('total pequeno demais para as parcelas não gera plano', () => {
    expect(planFromTotal(0.02, 3)).toBeNull();
  });
});
