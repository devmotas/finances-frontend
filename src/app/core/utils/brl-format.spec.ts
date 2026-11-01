import { formatLedgerBrl } from './brl-format';

describe('formatLedgerBrl', () => {
  const nbsp = (text: string) => text.replace(/\s/g, ' ');

  it('saída positiva leva menos e entrada positiva leva mais', () => {
    expect(nbsp(formatLedgerBrl(300, 'out'))).toBe('− R$ 300,00');
    expect(nbsp(formatLedgerBrl(300, 'in'))).toBe('+ R$ 300,00');
  });

  it('valor negativo inverte o sinal sem duplicar', () => {
    expect(nbsp(formatLedgerBrl(-475, 'out'))).toBe('+ R$ 475,00');
    expect(nbsp(formatLedgerBrl(-100, 'in'))).toBe('− R$ 100,00');
  });

  it('zero mantém o sinal do lado', () => {
    expect(nbsp(formatLedgerBrl(0, 'out'))).toBe('− R$ 0,00');
  });
});
