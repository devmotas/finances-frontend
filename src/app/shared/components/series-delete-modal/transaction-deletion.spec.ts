import { of } from 'rxjs';
import { Transaction } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { SERIES_DELETE_SCOPE } from './series-delete-scope';
import { TransactionDeletion } from './transaction-deletion';

describe('TransactionDeletion', () => {
  const seriesTx = { id: 7, schedule: 'fixed', recurrenceId: 3, amount: 100 } as Transaction;
  const singleTx = { id: 8, schedule: 'variable', recurrenceId: null, amount: 50 } as Transaction;

  let facade: jasmine.SpyObj<FinancesFacadeService>;
  let deletion: TransactionDeletion;

  beforeEach(() => {
    facade = jasmine.createSpyObj<FinancesFacadeService>('FinancesFacadeService', ['deleteTransaction']);
    facade.deleteTransaction.and.returnValue(of(undefined) as never);
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    deletion = new TransactionDeletion(facade, toast, {
      itemLabel: () => 'esta saída',
      deletedMessage: () => 'Saída excluída.',
    });
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
});
