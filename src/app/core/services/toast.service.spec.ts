import { TOAST_DURATION_MS, ToastService } from './toast.service';

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
});
