import { of, throwError } from 'rxjs';
import { InvestmentMovement, MOVEMENT_DIRECTION } from '../../core/models/investment-accounts.models';
import { InvestmentMovementsApiService } from '../../core/services/investment-movements-api.service';
import { ToastAction, ToastService } from '../../core/services/toast.service';
import { MovementDeletion } from './movement-deletion';

describe('MovementDeletion', () => {
  const movement: InvestmentMovement = {
    id: 5,
    investmentAccountId: 20,
    direction: MOVEMENT_DIRECTION.contribution,
    description: 'Caixinha',
    amount: 500,
    date: '2026-10-05',
  };

  let api: jasmine.SpyObj<InvestmentMovementsApiService>;
  let toast: jasmine.SpyObj<ToastService>;
  let changed: jasmine.Spy;
  let deletion: MovementDeletion;

  beforeEach(() => {
    api = jasmine.createSpyObj<InvestmentMovementsApiService>('api', ['delete', 'restore']);
    toast = jasmine.createSpyObj<ToastService>('toast', ['show', 'showWithAction']);
    changed = jasmine.createSpy('changed');
    deletion = new MovementDeletion(api, toast, { describe: () => 'este aporte', changed });
  });

  it('exclui, avisa a tela e oferece desfazer', () => {
    api.delete.and.returnValue(of([movement]));
    deletion.request(movement);
    expect(deletion.isOpen()).toBeTrue();

    deletion.confirm();

    expect(api.delete).toHaveBeenCalledWith(5);
    expect(deletion.isOpen()).toBeFalse();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(toast.showWithAction).toHaveBeenCalled();
  });

  it('o desfazer restaura os lançamentos excluídos', () => {
    api.delete.and.returnValue(of([movement]));
    api.restore.and.returnValue(of([movement]));
    deletion.request(movement);
    deletion.confirm();

    const action = toast.showWithAction.calls.mostRecent().args[2] as ToastAction;
    action.run().subscribe();

    expect(api.restore).toHaveBeenCalledWith([movement]);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('mantém o diálogo aberto e mostra o erro quando a exclusão falha', () => {
    api.delete.and.returnValue(throwError(() => new Error('offline')));
    deletion.request(movement);
    deletion.confirm();

    expect(deletion.isOpen()).toBeTrue();
    expect(deletion.deletingScope()).toBeNull();
    expect(toast.show).toHaveBeenCalledWith(jasmine.any(String), 'error');
  });
});
