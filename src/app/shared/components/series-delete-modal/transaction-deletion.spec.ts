import { of, Subject, throwError } from 'rxjs';
import { Category, Transaction } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
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
  } as Transaction;
  const singleTx = {
    id: 8,
    categoryId: 1,
    description: '',
    schedule: 'variable',
    recurrenceId: null,
    amount: 50,
  } as Transaction;

  let facade: jasmine.SpyObj<FinancesFacadeService>;
  let deletion: TransactionDeletion;

  beforeEach(() => {
    facade = jasmine.createSpyObj<FinancesFacadeService>('FinancesFacadeService', [
      'deleteTransaction',
      'getCategory',
    ]);
    facade.deleteTransaction.and.returnValue(of(undefined) as never);
    facade.getCategory.and.returnValue({ id: 1, name: 'Moradia' } as Category);
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    deletion = new TransactionDeletion(facade, toast, {
      itemLabel: () => 'esta saída',
      deletedMessage: () => 'Saída excluída.',
    });
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
    const response = new Subject<void>();
    facade.deleteTransaction.and.returnValue(response as never);
    deletion.request(seriesTx);

    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);
    deletion.confirm(SERIES_DELETE_SCOPE.thisAndFuture);
    deletion.cancel();

    expect(deletion.isOpen()).toBeTrue();
    expect(deletion.deletingScope()).toBe(SERIES_DELETE_SCOPE.thisAndFuture);
    expect(facade.deleteTransaction).toHaveBeenCalledTimes(1);

    response.next();
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
});
