import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { Category, Transaction } from '../models/finances.models';
import { LOAD_STATE } from '../models/load-state.model';
import { AuthTokenService } from './auth-token.service';
import { CategoryApiService } from './category-api.service';
import { FinancesFacadeService } from './finances-facade.service';
import { RecurrenceApiService } from './recurrence-api.service';
import { TransactionApiService } from './transaction-api.service';
import { UserApiService } from './user-api.service';
import { UserProfileService } from './user-profile.service';

describe('FinancesFacadeService - estado de carga', () => {
  let categoryApi: jasmine.SpyObj<CategoryApiService>;
  let transactionApi: jasmine.SpyObj<TransactionApiService>;
  let facade: FinancesFacadeService;

  const someCategory = { id: 1, name: 'Salário', flow: 'income' } as Category;

  beforeEach(() => {
    categoryApi = jasmine.createSpyObj<CategoryApiService>('CategoryApiService', ['getAll']);
    transactionApi = jasmine.createSpyObj<TransactionApiService>('TransactionApiService', [
      'getByMonth',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryApiService, useValue: categoryApi },
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: AuthTokenService, useValue: { hasToken: signal(false) } },
        { provide: RecurrenceApiService, useValue: {} },
        { provide: UserApiService, useValue: {} },
        { provide: UserProfileService, useValue: {} },
      ],
    });
    facade = TestBed.inject(FinancesFacadeService);
  });

  it('marca erro em vez de lista vazia quando a API falha', () => {
    categoryApi.getAll.and.returnValue(throwError(() => new Error('offline')));
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));

    facade.reloadCurrentMonth();

    expect(facade.loadState()).toBe(LOAD_STATE.error);
    expect(facade.hasLoadError()).toBeTrue();
  });

  it('mantém os dados anteriores quando a recarga falha', () => {
    categoryApi.getAll.and.returnValue(of([someCategory]));
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));
    facade.reloadCurrentMonth();

    transactionApi.getByMonth.and.returnValue(throwError(() => new Error('offline')));
    facade.reloadCurrentMonth();

    expect(facade.categories()).toEqual([someCategory]);
    expect(facade.hasLoadError()).toBeTrue();
  });

  it('descarta a resposta de uma carga antiga quando outra começa', () => {
    const olderCategory = { id: 2, name: 'Antiga', flow: 'income' } as Category;
    const slowCategories = new Subject<Category[]>();
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));
    categoryApi.getAll.and.returnValue(slowCategories);
    facade.reloadCurrentMonth();

    categoryApi.getAll.and.returnValue(of([someCategory]));
    facade.reloadCurrentMonth();
    slowCategories.next([olderCategory]);
    slowCategories.complete();

    expect(facade.categories()).toEqual([someCategory]);
  });

  it('limpa o erro quando uma nova tentativa dá certo', () => {
    categoryApi.getAll.and.returnValue(throwError(() => new Error('offline')));
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));
    facade.reloadCurrentMonth();

    categoryApi.getAll.and.returnValue(of([someCategory]));
    facade.reloadCurrentMonth();

    expect(facade.loadState()).toBe(LOAD_STATE.ok);
    expect(facade.hasLoadError()).toBeFalse();
    expect(facade.categories()).toEqual([someCategory]);
  });
});
