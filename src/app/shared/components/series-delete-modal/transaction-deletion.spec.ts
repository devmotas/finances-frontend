import { of, Subject, throwError } from 'rxjs';
import {
  Category,
  Transaction,
  TransactionDeletionResult,
} from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastAction, ToastService } from '../../../core/services/toast.service';
import { SERIES_DELETE_SCOPE } from './series-delete-scope';
import { TransactionDeletion } from './transaction-deletion';

function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

describe('TransactionDeletion', () => {
  const seriesTx = {
    id: 7,
    categoryId: 1,
    description: 'Academia',
    schedule: 'fixed',
    recurrenceId: 3,
    amount: 100,
    date: '2026-10-05',
    recurrenceIndex: 2,
  } as Transaction;
  const singleTx = {
    id: 8,
    categoryId: 1,
    description: '',
    schedule: 'variable',
    recurrenceId: null,
    amount: 50,
    date: '2026-10-09',
  } as Transaction;
  const nextMonthTx = { ...seriesTx, id: 9, date: '2026-11-05', recurrenceIndex: 3 } as Transaction;
  const seriesClosed: TransactionDeletionResult = {
    deleted: [seriesTx, nextMonthTx],
    closedSeries: [{ recurrenceId: 3, previousEndMonth: null }],
  };

  let facade: jasmine.SpyObj<FinancesFacadeService>;
  let toast: jasmine.SpyObj<ToastService>;
  let deletion: TransactionDeletion;

  function undoAction(): ToastAction {
    return toast.showWithAction.calls.mostRecent().args[2];
  }

  beforeEach(() => {
    facade = jasmine.createSpyObj<FinancesFacadeService>('FinancesFacadeService', [
      'deleteTransaction',
      'getCategory',
      'restoreTransactions',
    ]);
    facade.deleteTransaction.and.returnValue(of(seriesClosed));
    facade.getCategory.and.returnValue({ id: 1, name: 'Moradia' } as Category);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show', 'showWithAction']);
    facade.restoreTransactions.and.returnValue(of([seriesTx, nextMonthTx]));
    deletion = new TransactionDeletion(
      facade,
      toast,
      { itemLabel: () => 'esta saída', deletedMessage: () => 'Saída excluída.' }
    );
  });

  it('identifica o lançamento pela descrição e pelo valor', () => {
    deletion.request(seriesTx);

    expect(deletion.itemLabel()).toBe(`esta saída “Academia” de ${brl(100)}`);
  });

  it('usa o nome da categoria quando não há descrição', () => {
    deletion.request(singleTx);

    expect(deletion.itemLabel()).toBe(`esta saída “Moradia” de ${brl(50)}`);
  });

  it('cancelar não faz nenhuma requisição', () => {
    deletion.request(seriesTx);
    deletion.cancel();
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);

    expect(facade.deleteTransaction).not.toHaveBeenCalled();
    expect(deletion.isOpen()).toBeFalse();
  });

  it('"só este mês" não aplica aos próximos', () => {
    deletion.request(seriesTx);
    deletion.confirm(SERIES_DELETE_SCOPE.thisMonth);

    expect(facade.deleteTransaction).toHaveBeenCalledOnceWith(7, { applyToFutureSeries: false });
  });

  it('"este e os próximos" aplica à série', () => {
    deletion.request(seriesTx);
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);

    expect(facade.deleteTransaction).toHaveBeenCalledOnceWith(7, { applyToFutureSeries: true });
  });

  it('lançamento avulso nunca aplica à série', () => {
    deletion.request(singleTx);
    expect(deletion.isSeries()).toBeFalse();
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);

    expect(facade.deleteTransaction).toHaveBeenCalledOnceWith(8, { applyToFutureSeries: false });
  });

  it('mantém o modal aberto e indica o escopo enquanto a exclusão está em andamento', () => {
    const response = new Subject<TransactionDeletionResult>();
    facade.deleteTransaction.and.returnValue(response as never);
    deletion.request(seriesTx);

    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);
    deletion.cancel();

    expect(deletion.isOpen()).toBeTrue();
    expect(deletion.deletingScope()).toBe(SERIES_DELETE_SCOPE.thisAndFuture);
    expect(facade.deleteTransaction).toHaveBeenCalledTimes(1);

    response.next(seriesClosed);
    response.complete();

    expect(deletion.isOpen()).toBeFalse();
    expect(deletion.deletingScope()).toBeNull();
  });

  it('reabilita o modal quando a exclusão falha', () => {
    facade.deleteTransaction.and.returnValue(throwError(() => new Error('offline')) as never);
    deletion.request(singleTx);

    deletion.confirm(SERIES_DELETE_SCOPE.thisMonth);

    expect(deletion.isOpen()).toBeTrue();
    expect(deletion.deletingScope()).toBeNull();
  });

  it('oferece desfazer a exclusão no toast de sucesso', () => {
    deletion.request(seriesTx);
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);

    expect(toast.showWithAction).toHaveBeenCalledOnceWith(
      'Saída excluída.',
      'success',
      jasmine.objectContaining({ label: 'Desfazer', busyLabel: 'Desfazendo…' })
    );
  });

  it('desfazer o encerramento restaura as linhas e reabre a série com o fim anterior', () => {
    deletion.request(seriesTx);
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);

    undoAction().run().subscribe();

    expect(facade.restoreTransactions).toHaveBeenCalledOnceWith(
      [
        {
          categoryId: 1,
          investmentAccountId: null,
          direction: null,
          description: 'Academia',
          amount: 100,
          date: '2026-10-05',
          recurrenceId: 3,
          recurrenceIndex: 2,
        },
        {
          categoryId: 1,
          investmentAccountId: null,
          direction: null,
          description: 'Academia',
          amount: 100,
          date: '2026-11-05',
          recurrenceId: 3,
          recurrenceIndex: 3,
        },
      ],
      [{ recurrenceId: 3, endMonth: null }]
    );
    expect(toast.show).toHaveBeenCalledOnceWith('Exclusão desfeita.', 'success');
  });

  it('desfazer envia descrição vazia como nula e lançamento avulso sem série', () => {
    facade.deleteTransaction.and.returnValue(of({ deleted: [singleTx], closedSeries: [] }));
    deletion.request(singleTx);
    deletion.confirm(SERIES_DELETE_SCOPE.thisMonth);

    undoAction().run().subscribe();

    expect(facade.restoreTransactions).toHaveBeenCalledOnceWith(
      [
        {
          categoryId: 1,
          investmentAccountId: null,
          direction: null,
          description: null,
          amount: 50,
          date: '2026-10-09',
          recurrenceId: null,
          recurrenceIndex: null,
        },
      ],
      []
    );
  });

  it('desfazer um resgate mantém a direção', () => {
    const withdrawal = {
      ...singleTx,
      id: 12,
      flow: 'investment',
      amount: 300,
      direction: 'withdrawal',
    } as Transaction;
    facade.deleteTransaction.and.returnValue(of({ deleted: [withdrawal], closedSeries: [] }));
    deletion.request(withdrawal);
    deletion.confirm(SERIES_DELETE_SCOPE.thisMonth);

    undoAction().run().subscribe();

    const [restored] = facade.restoreTransactions.calls.mostRecent().args[0];
    expect(restored.direction).toBe('withdrawal');
    expect(restored.amount).toBe(300);
  });

  it('informa o tipo da série para o texto do modal', () => {
    deletion.request({ ...seriesTx, seriesKind: 'installment' } as Transaction);

    expect(deletion.seriesKind()).toBe('installment');
  });

  it('avisa quando não consegue desfazer', () => {
    facade.restoreTransactions.and.returnValue(throwError(() => new Error('offline')));
    deletion.request(seriesTx);
    deletion.confirm(SERIES_DELETE_SCOPE.thisMonth);
    const completed = jasmine.createSpy('completed');

    undoAction().run().subscribe({ complete: completed });

    expect(completed).toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledOnceWith(jasmine.any(String), 'error');
  });
});
