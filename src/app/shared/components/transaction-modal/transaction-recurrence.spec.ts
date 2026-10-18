import { RECURRENCE, recurrenceOptionsFor, seriesRequest, SeriesFormValue } from './transaction-recurrence';

describe('transaction-recurrence', () => {
  const form: SeriesFormValue = {
    choice: RECURRENCE.fixed,
    categoryId: 15,
    description: 'Aluguel',
    startDate: '2026-11-05',
    amount: 1500,
    installments: 10,
    amountIsTotal: false,
  };

  it('saída oferece avulso, fixo e compra parcelada', () => {
    expect(recurrenceOptionsFor('expense').map((o) => o.label)).toEqual([
      'Só neste mês',
      'Fixo — todo mês, sem data para acabar',
      'Compra parcelada',
    ]);
  });

  it('entrada não oferece compra parcelada', () => {
    expect(recurrenceOptionsFor('income').map((o) => o.value)).toEqual(['single', 'fixed']);
  });

  it('fixo vira série fixa sem número de meses', () => {
    expect(seriesRequest(form)).toEqual({
      categoryId: 15,
      description: 'Aluguel',
      startDate: '2026-11-05',
      kind: 'fixed',
      amount: 1500,
    });
  });

  it('compra parcelada pelo valor da parcela', () => {
    expect(seriesRequest({ ...form, choice: RECURRENCE.installment, amount: 250 })).toEqual({
      categoryId: 15,
      description: 'Aluguel',
      startDate: '2026-11-05',
      kind: 'installment',
      installments: 10,
      amount: 250,
    });
  });

  it('compra parcelada pelo valor total manda totalAmount', () => {
    const request = seriesRequest({
      ...form,
      choice: RECURRENCE.installment,
      amount: 100,
      installments: 3,
      amountIsTotal: true,
    });

    expect(request).toEqual({
      categoryId: 15,
      description: 'Aluguel',
      startDate: '2026-11-05',
      kind: 'installment',
      installments: 3,
      totalAmount: 100,
    });
  });

  it('avulso não cria série', () => {
    expect(seriesRequest({ ...form, choice: RECURRENCE.single })).toBeNull();
  });
});
