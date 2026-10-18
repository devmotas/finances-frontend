import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { Category, Transaction } from '../models/finances.models';
import { LOAD_STATE } from '../models/load-state.model';
import { AuthTokenService } from './auth-token.service';
import { CategoryApiService } from './category-api.service';
import { FinanceSummaryApiService, FinanceSummaryDto } from './finance-summary-api.service';
import { FinancesFacadeService } from './finances-facade.service';
import { RecurrenceApiService } from './recurrence-api.service';
import { TransactionApiService } from './transaction-api.service';
import { UserApiService } from './user-api.service';
import { UserProfileService } from './user-profile.service';

const monthSummary = {
  year: 2026,
  month: 4,
  totalIncome: 5000,
  totalEssential: 2000,
  totalNonEssential: 300,
  totalExpenses: 2300,
  netInvested: 300,
  monthBalance: 2400,
} as FinanceSummaryDto;

const summaryApiStub = { get: () => of(monthSummary) };

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
        { provide: FinanceSummaryApiService, useValue: summaryApiStub },
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

  it('indica dados do mês pendentes até a primeira carga terminar', () => {
    const slowCategories = new Subject<Category[]>();
    categoryApi.getAll.and.returnValue(slowCategories);
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));

    facade.reloadCurrentMonth();
    expect(facade.isMonthDataPending()).toBeTrue();
    expect(facade.isMonthDataReady()).toBeFalse();

    slowCategories.next([someCategory]);
    slowCategories.complete();

    expect(facade.isMonthDataPending()).toBeFalse();
    expect(facade.isMonthDataReady()).toBeTrue();
  });

  it('não volta a pendente ao recarregar o mesmo mês já exibido', () => {
    categoryApi.getAll.and.returnValue(of([someCategory]));
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));
    facade.reloadCurrentMonth();

    categoryApi.getAll.and.returnValue(new Subject<Category[]>());
    facade.reloadCurrentMonth();

    expect(facade.isLoading()).toBeTrue();
    expect(facade.isMonthDataPending()).toBeFalse();
  });
});

describe('FinancesFacadeService - avisos de alteração', () => {
  let categoryApi: jasmine.SpyObj<CategoryApiService>;
  let transactionApi: jasmine.SpyObj<TransactionApiService>;
  let facade: FinancesFacadeService;
  let changedFlows: string[];

  const investmentCategory = { id: 4, name: 'Tesouro', flow: 'investment' } as Category;
  const contribution = {
    id: 10,
    categoryId: 4,
    description: '',
    amount: 500,
    date: '2026-04-10',
    schedule: 'variable',
    flow: 'investment',
    direction: 'contribution',
  } as Transaction;

  beforeEach(() => {
    categoryApi = jasmine.createSpyObj<CategoryApiService>('CategoryApiService', [
      'getAll',
      'update',
    ]);
    transactionApi = jasmine.createSpyObj<TransactionApiService>('TransactionApiService', [
      'getByMonth',
      'create',
      'delete',
    ]);
    categoryApi.getAll.and.returnValue(of([investmentCategory]));
    transactionApi.getByMonth.and.returnValue(of([contribution]));

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryApiService, useValue: categoryApi },
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: AuthTokenService, useValue: { hasToken: signal(false) } },
        { provide: RecurrenceApiService, useValue: {} },
        { provide: FinanceSummaryApiService, useValue: summaryApiStub },
        { provide: UserApiService, useValue: {} },
        { provide: UserProfileService, useValue: {} },
      ],
    });
    facade = TestBed.inject(FinancesFacadeService);
    facade.reloadCurrentMonth();
    changedFlows = [];
    facade.dataChanged$.subscribe((flow) => changedFlows.push(flow));
  });

  it('avisa o fluxo do lançamento criado depois da resposta', () => {
    const response = new Subject<Transaction>();
    transactionApi.create.and.returnValue(response);

    facade
      .addTransaction({ categoryId: 4, amount: 500, date: '2026-04-10', schedule: 'variable' })
      .subscribe();
    expect(changedFlows).toEqual([]);

    response.next(contribution);
    expect(changedFlows).toEqual(['investment']);
  });

  it('avisa o fluxo do lançamento excluído', () => {
    transactionApi.delete.and.returnValue(of({ deleted: [contribution], closedSeries: [] }));

    facade.deleteTransaction(contribution.id).subscribe();

    expect(changedFlows).toEqual(['investment']);
  });

  it('avisa o fluxo da categoria alterada', () => {
    categoryApi.update.and.returnValue(of(investmentCategory));

    facade.updateCategory(investmentCategory).subscribe();

    expect(changedFlows).toEqual(['investment']);
  });

  it('não avisa nada quando a requisição falha', () => {
    transactionApi.delete.and.returnValue(throwError(() => new Error('offline')));

    facade.deleteTransaction(contribution.id).subscribe({ error: () => undefined });

    expect(changedFlows).toEqual([]);
  });
});

describe('FinancesFacadeService - resposta perdida ao salvar', () => {
  let categoryApi: jasmine.SpyObj<CategoryApiService>;
  let transactionApi: jasmine.SpyObj<TransactionApiService>;
  let recurrenceApi: jasmine.SpyObj<RecurrenceApiService>;
  let facade: FinancesFacadeService;
  let changedFlows: string[];
  let receivedErrors: unknown[];

  const expenseCategory = { id: 7, name: 'Aluguel', flow: 'expense' } as Category;
  const lostResponse = new HttpErrorResponse({ status: 0 });
  const serverError = new HttpErrorResponse({ status: 500 });
  const seriesDto = {
    categoryId: expenseCategory.id,
    description: null,
    amount: 1500,
    startDate: '2026-04-05',
    kind: 'fixed' as const,
  };

  beforeEach(() => {
    categoryApi = jasmine.createSpyObj<CategoryApiService>('CategoryApiService', ['getAll']);
    transactionApi = jasmine.createSpyObj<TransactionApiService>('TransactionApiService', [
      'getByMonth',
      'create',
    ]);
    recurrenceApi = jasmine.createSpyObj<RecurrenceApiService>('RecurrenceApiService', ['create']);
    categoryApi.getAll.and.returnValue(of([expenseCategory]));
    transactionApi.getByMonth.and.returnValue(of([] as Transaction[]));

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryApiService, useValue: categoryApi },
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: RecurrenceApiService, useValue: recurrenceApi },
        { provide: FinanceSummaryApiService, useValue: summaryApiStub },
        { provide: AuthTokenService, useValue: { hasToken: signal(false) } },
        { provide: UserApiService, useValue: {} },
        { provide: UserProfileService, useValue: {} },
      ],
    });
    facade = TestBed.inject(FinancesFacadeService);
    facade.reloadCurrentMonth();
    transactionApi.getByMonth.calls.reset();
    changedFlows = [];
    receivedErrors = [];
    facade.dataChanged$.subscribe((flow) => changedFlows.push(flow));
  });

  it('recarrega o mês quando a criação da série fica sem resposta', () => {
    recurrenceApi.create.and.returnValue(throwError(() => lostResponse));

    facade.createRecurrence(seriesDto).subscribe({ error: (err) => receivedErrors.push(err) });

    expect(transactionApi.getByMonth).toHaveBeenCalledTimes(1);
    expect(changedFlows).toEqual(['expense']);
    expect(receivedErrors).toEqual([lostResponse]);
  });

  it('recarrega o mês quando o lançamento avulso fica sem resposta', () => {
    transactionApi.create.and.returnValue(throwError(() => lostResponse));

    facade
      .addTransaction({ categoryId: expenseCategory.id, amount: 80, date: '2026-04-10', schedule: 'variable' })
      .subscribe({ error: (err) => receivedErrors.push(err) });

    expect(transactionApi.getByMonth).toHaveBeenCalledTimes(1);
    expect(changedFlows).toEqual(['expense']);
    expect(receivedErrors).toEqual([lostResponse]);
  });

  it('não recarrega quando o servidor responde com erro', () => {
    recurrenceApi.create.and.returnValue(throwError(() => serverError));

    facade.createRecurrence(seriesDto).subscribe({ error: (err) => receivedErrors.push(err) });

    expect(transactionApi.getByMonth).not.toHaveBeenCalled();
    expect(changedFlows).toEqual([]);
    expect(receivedErrors).toEqual([serverError]);
  });
});

describe('FinancesFacadeService - resumo e séries', () => {
  let categoryApi: jasmine.SpyObj<CategoryApiService>;
  let transactionApi: jasmine.SpyObj<TransactionApiService>;
  let summaryApi: jasmine.SpyObj<FinanceSummaryApiService>;
  let facade: FinancesFacadeService;

  const investmentCategory = { id: 4, name: 'Tesouro', flow: 'investment' } as Category;
  const withdrawal = {
    id: 11,
    categoryId: 4,
    investmentAccountId: null,
    description: 'Uso',
    amount: 200,
    date: '2026-04-12',
    schedule: 'variable',
    flow: 'investment',
    direction: 'withdrawal',
  } as Transaction;

  beforeEach(() => {
    categoryApi = jasmine.createSpyObj<CategoryApiService>('CategoryApiService', ['getAll']);
    transactionApi = jasmine.createSpyObj<TransactionApiService>('TransactionApiService', [
      'getByMonth',
      'update',
      'restore',
    ]);
    summaryApi = jasmine.createSpyObj<FinanceSummaryApiService>('FinanceSummaryApiService', ['get']);
    categoryApi.getAll.and.returnValue(of([investmentCategory]));
    transactionApi.getByMonth.and.returnValue(of([withdrawal]));
    summaryApi.get.and.returnValue(of(monthSummary));

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryApiService, useValue: categoryApi },
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: FinanceSummaryApiService, useValue: summaryApi },
        { provide: AuthTokenService, useValue: { hasToken: signal(false) } },
        { provide: RecurrenceApiService, useValue: {} },
        { provide: UserApiService, useValue: {} },
        { provide: UserProfileService, useValue: {} },
      ],
    });
    facade = TestBed.inject(FinancesFacadeService);
    facade.reloadCurrentMonth();
  });

  it('usa os totais do resumo do backend, com investimento líquido', () => {
    expect(facade.summary()).toBe(monthSummary);
    expect(facade.monthTotals()).toEqual({
      totalIncome: 5000,
      totalEssential: 2000,
      totalNonEssential: 300,
      totalExpenses: 2300,
      totalInvestments: 300,
      balance: 2400,
    });
  });

  it('marca erro quando o resumo do mês falha', () => {
    summaryApi.get.and.returnValue(throwError(() => new Error('offline')));

    facade.reloadCurrentMonth();

    expect(facade.hasLoadError()).toBeTrue();
  });

  it('edita um resgate mandando valor positivo e a direção', () => {
    transactionApi.update.and.returnValue(of(withdrawal));

    facade.updateTransaction({ ...withdrawal, amount: 250 }).subscribe();

    expect(transactionApi.update).toHaveBeenCalledOnceWith(
      11,
      { categoryId: 4, direction: 'withdrawal', description: 'Uso', amount: 250, date: '2026-04-12' },
      false
    );
  });

  it('desfazer repassa as séries a reabrir', () => {
    transactionApi.restore.and.returnValue(of([withdrawal]));
    const reopen = [{ recurrenceId: 21, endMonth: null }];

    facade.restoreTransactions([], reopen).subscribe();

    expect(transactionApi.restore).toHaveBeenCalledOnceWith([], reopen);
  });
});
