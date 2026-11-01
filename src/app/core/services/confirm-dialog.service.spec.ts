import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  const request = { title: 'Sair', message: 'Deseja sair?', confirmLabel: 'Sair' };

  it('resolve com a escolha e fecha o diálogo', async () => {
    const service = new ConfirmDialogService();
    const answer = service.ask(request);
    expect(service.current()?.title).toBe('Sair');
    service.settle(true);
    expect(await answer).toBeTrue();
    expect(service.current()).toBeNull();
  });

  it('um novo pedido cancela o anterior', async () => {
    const service = new ConfirmDialogService();
    const first = service.ask(request);
    service.ask({ ...request, title: 'Excluir' });
    expect(await first).toBeFalse();
    expect(service.current()?.title).toBe('Excluir');
  });
});
