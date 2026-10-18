import {
  destinationAccountIdFrom,
  NO_DESTINATION,
  offersDestination,
  RECURRENCE,
  recurrenceOptionsFor,
  seriesRequest,
  SeriesFormValue,
} from './transaction-recurrence';

describe('transaction-recurrence', () => {
  const form: SeriesFormValue = {
    choice: RECURRENCE.fixed,
    categoryId: 15,
    description: 'Aluguel',
    startDate: '2026-11-05',
    amount: 1500,
    installments: 10,
    amountIsTotal: false,
    destinationAccountId: null,
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

  it('entrada fixa com destino manda a conta de investimento', () => {
    expect(seriesRequest({ ...form, description: 'PTR da Vale', amount: 810.5, destinationAccountId: 20 })).toEqual({
      categoryId: 15,
      description: 'PTR da Vale',
      startDate: '2026-11-05',
      kind: 'fixed',
      amount: 810.5,
      destinationAccountId: 20,
    });
  });

  it('compra parcelada nunca leva conta de destino', () => {
    const request = seriesRequest({ ...form, choice: RECURRENCE.installment, destinationAccountId: 20 });

    expect(request).not.toEqual(jasmine.objectContaining({ destinationAccountId: 20 }));
  });

  it('"Guardar direto em" só aparece em entrada fixa', () => {
    expect(offersDestination('income', RECURRENCE.fixed)).toBeTrue();
    expect(offersDestination('income', RECURRENCE.single)).toBeFalse();
    expect(offersDestination('expense', RECURRENCE.fixed)).toBeFalse();
  });

  it('sem conta escolhida não há destino', () => {
    expect(destinationAccountIdFrom(NO_DESTINATION)).toBeNull();
    expect(destinationAccountIdFrom('20')).toBe(20);
  });

  it('avulso não cria série', () => {
    expect(seriesRequest({ ...form, choice: RECURRENCE.single })).toBeNull();
  });
});
