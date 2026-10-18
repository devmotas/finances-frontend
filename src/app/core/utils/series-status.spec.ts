import { Transaction } from '../models/finances.models';
import {
  descriptionWithoutInstallmentPrefix,
  installmentPosition,
  seriesEndingNotice,
  seriesKindLabel,
  shortMonthYearLabel,
} from './series-status';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    categoryId: 1,
    description: '',
    amount: 100,
    date: '2026-10-05',
    schedule: 'variable',
    flow: 'expense',
    recurrenceId: null,
    recurrenceIndex: null,
    seriesKind: null,
    seriesEndsOn: null,
    ...overrides,
  };
}

const fixedSeries = { schedule: 'fixed', recurrenceId: 8, recurrenceIndex: 2, seriesKind: 'fixed' } as const;
const installmentSeries = { schedule: 'fixed', recurrenceId: 9, seriesKind: 'installment' } as const;

describe('series-status', () => {
  it('formata o mês curto sem ponto', () => {
    expect(shortMonthYearLabel('2026-12')).toBe('dez/2026');
  });

  describe('seriesKindLabel', () => {
    it('avulso aparece como "Este mês"', () => {
      expect(seriesKindLabel(tx({}))).toBe('Este mês');
    });

    it('série fixa aparece como "Fixo"', () => {
      expect(seriesKindLabel(tx(fixedSeries))).toBe('Fixo');
    });

    it('parcela mostra a posição calculada pelo fim da série', () => {
      const parcel = tx({ ...installmentSeries, recurrenceIndex: 3, seriesEndsOn: '2027-04' });

      expect(installmentPosition(parcel)).toEqual({ index: 3, total: 9 });
      expect(seriesKindLabel(parcel)).toBe('Parcela 3 de 9');
    });
  });

  describe('seriesEndingNotice', () => {
    it('série fixa sem fim não avisa', () => {
      expect(seriesEndingNotice(tx(fixedSeries))).toBeNull();
    });

    it('série fixa encerrada avisa até dois meses antes', () => {
      expect(seriesEndingNotice(tx({ ...fixedSeries, seriesEndsOn: '2026-12' }))).toBe(
        'Termina em dez/2026'
      );
      expect(seriesEndingNotice(tx({ ...fixedSeries, seriesEndsOn: '2026-10' }))).toBe(
        'Termina em out/2026'
      );
    });

    it('série fixa que termina daqui a mais de dois meses não avisa', () => {
      expect(seriesEndingNotice(tx({ ...fixedSeries, seriesEndsOn: '2027-01' }))).toBeNull();
    });

    it('compra parcelada avisa só na última parcela', () => {
      const last = tx({ ...installmentSeries, recurrenceIndex: 10, seriesEndsOn: '2026-10' });
      const beforeLast = tx({ ...installmentSeries, recurrenceIndex: 9, seriesEndsOn: '2026-11' });

      expect(seriesEndingNotice(last)).toBe('Última parcela');
      expect(seriesEndingNotice(beforeLast)).toBeNull();
    });
  });

  it('tira o prefixo "Parcela X de Y" da descrição', () => {
    expect(descriptionWithoutInstallmentPrefix('Parcela 2 de 10: Notebook')).toBe('Notebook');
    expect(descriptionWithoutInstallmentPrefix('Parcela 2 de 10')).toBe('');
    expect(descriptionWithoutInstallmentPrefix('Mercado')).toBe('Mercado');
  });
});
