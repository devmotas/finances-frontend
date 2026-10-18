import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { LOAD_STATE, LoadState } from '../../../core/models/load-state.model';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { MonthContextService, YearMonth } from '../../../core/services/month-context.service';
import { MonthScopedResource, monthScopedResource } from './month-scoped-resource';

describe('monthScopedResource', () => {
  const loadState = signal<LoadState>(LOAD_STATE.ok);
  let monthCtx: MonthContextService;

  beforeEach(() => {
    loadState.set(LOAD_STATE.ok);
    TestBed.configureTestingModule({
      providers: [{ provide: FinancesFacadeService, useValue: { loadState } }],
    });
    monthCtx = TestBed.inject(MonthContextService);
    monthCtx.setMonth(2026, 10);
  });

  function create<T>(fetch: (month: YearMonth) => Observable<T>): MonthScopedResource<T> {
    const resource = runInInjectionContext(TestBed.inject(Injector), () => monthScopedResource(fetch));
    TestBed.flushEffects();
    return resource;
  }

  it('carrega o valor do mês selecionado', () => {
    const resource = create((month) => of(month.month));

    expect(resource.value()).toBe(10);
    expect(resource.isPending()).toBeFalse();
  });

  it('esconde o valor de outro mês enquanto o novo carrega', () => {
    const resource = create(() => of('outubro'));
    monthCtx.setMonth(2026, 11);

    expect(resource.value()).toBeNull();
  });

  it('marca erro e tenta de novo quando o mês volta a carregar', () => {
    let fails = true;
    const resource = create(() => (fails ? throwError(() => new Error('offline')) : of('ok')));
    expect(resource.hasError()).toBeTrue();

    fails = false;
    loadState.set(LOAD_STATE.loading);
    TestBed.flushEffects();

    expect(resource.hasError()).toBeFalse();
    expect(resource.value()).toBe('ok');
  });
});
