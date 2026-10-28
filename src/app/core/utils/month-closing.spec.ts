import { CLOSING_TOLERANCE, closingStatus, meterWidths, walletPlanStatus } from './month-closing';

describe('month-closing', () => {
  it('fechamento negativo falta, perto de zero fecha e acima da folga sobra', () => {
    expect(closingStatus(-138.12)).toEqual({ tone: 'short', amount: 138.12 });
    expect(closingStatus(CLOSING_TOLERANCE)).toEqual({ tone: 'even', amount: CLOSING_TOLERANCE });
    expect(closingStatus(0).tone).toBe('even');
    expect(closingStatus(2000)).toEqual({ tone: 'surplus', amount: 2000 });
  });

  it('carteira planejada acima do disponível diz quanto passa e o máximo para fechar no zero', () => {
    const status = walletPlanStatus(708.86, 750);
    expect(status.tone).toBe('short');
    expect(status.amount).toBeCloseTo(41.14, 2);
    expect(status.maxTransfer).toBe(708.86);
  });

  it('sem disponível o máximo para a carteira é zero', () => {
    expect(walletPlanStatus(-300, 750).maxTransfer).toBe(0);
  });

  it('as barras usam a mesma escala para disponível e planejado', () => {
    expect(meterWidths(500, 1000)).toEqual({ available: 50, planned: 100 });
    expect(meterWidths(-10, 750)).toEqual({ available: 0, planned: 100 });
    expect(meterWidths(0, 0)).toEqual({ available: 0, planned: 0 });
  });
});
