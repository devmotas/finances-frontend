import { Subject } from 'rxjs';
import {
  TOAST_ACTION_DURATION_MS,
  TOAST_DURATION_MS,
  ToastAction,
  ToastService,
} from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date());
    service = new ToastService();
  });

  afterEach(() => jasmine.clock().uninstall());

  function tick(ms: number): void {
    jasmine.clock().tick(ms);
  }

  function showUndo(run: ToastAction['run']): number {
    service.showWithAction('Saída excluída.', 'success', {
      label: 'Desfazer',
      busyLabel: 'Desfazendo…',
      run,
    });
    return service.toasts()[0].id;
  }

  it('erros ficam mais tempo na tela que sucessos', () => {
    expect(TOAST_DURATION_MS.error).toBeGreaterThan(TOAST_DURATION_MS.success);

    service.show('ok', 'success');
    service.show('falhou', 'error');
    tick(TOAST_DURATION_MS.success);

    expect(service.toasts().map((t) => t.kind)).toEqual(['error']);
  });

  it('pausar mantém o toast até retomar', () => {
    service.show('ok', 'success');
    const id = service.toasts()[0].id;

    service.pause(id);
    tick(TOAST_DURATION_MS.success * 2);
    expect(service.toasts().length).toBe(1);

    service.resume(id);
    tick(TOAST_DURATION_MS.success);
    expect(service.toasts().length).toBe(0);
  });

  it('retomar continua do tempo restante', () => {
    const elapsed = TOAST_DURATION_MS.success / 2;
    service.show('ok', 'success');
    const id = service.toasts()[0].id;

    tick(elapsed);
    service.pause(id);
    service.resume(id);
    tick(TOAST_DURATION_MS.success - elapsed);

    expect(service.toasts().length).toBe(0);
  });

  it('toasts com ação ficam mais tempo na tela', () => {
    expect(TOAST_ACTION_DURATION_MS).toBeGreaterThan(TOAST_DURATION_MS.success);

    showUndo(() => new Subject<void>());
    tick(TOAST_DURATION_MS.success);
    expect(service.toasts().length).toBe(1);

    tick(TOAST_ACTION_DURATION_MS - TOAST_DURATION_MS.success);
    expect(service.toasts().length).toBe(0);
  });

  it('executa a ação uma única vez e mantém o toast ocupado até concluir', () => {
    const result = new Subject<void>();
    const run = jasmine.createSpy('run').and.returnValue(result);
    const id = showUndo(run);

    service.runAction(id);
    service.runAction(id);
    service.resume(id);
    tick(TOAST_ACTION_DURATION_MS * 2);

    expect(run).toHaveBeenCalledTimes(1);
    expect(service.toasts()[0].actionBusy).toBeTrue();

    result.complete();

    expect(service.toasts().length).toBe(0);
  });

  it('ação de um toast já fechado não é executada', () => {
    const run = jasmine.createSpy('run').and.returnValue(new Subject<void>());
    const id = showUndo(run);

    service.dismiss(id);
    service.runAction(id);

    expect(run).not.toHaveBeenCalled();
  });
});
