import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InvestmentMovement, MOVEMENT_DIRECTION } from '../models/investment-accounts.models';
import { InvestmentMovementsApiService } from './investment-movements-api.service';

describe('InvestmentMovementsApiService', () => {
  let api: InvestmentMovementsApiService;
  let http: HttpTestingController;

  const movement: InvestmentMovement = {
    id: 5,
    investmentAccountId: 20,
    direction: MOVEMENT_DIRECTION.withdrawal,
    description: 'Mês apertado',
    amount: 300,
    date: '2026-10-05',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(InvestmentMovementsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia valor positivo com a direção ao criar', () => {
    api
      .create({
        investmentAccountId: 20,
        direction: MOVEMENT_DIRECTION.withdrawal,
        amount: 300,
        date: '2026-10-05',
        description: null,
      })
      .subscribe();
    const req = http.expectOne('/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.amount).toBe(300);
    expect(req.request.body.direction).toBe(MOVEMENT_DIRECTION.withdrawal);
    req.flush(movement);
  });

  it('edita com PUT /transactions/:id', () => {
    api.update(5, { ...movement, investmentAccountId: 20 }).subscribe();
    const req = http.expectOne('/transactions/5');
    expect(req.request.method).toBe('PUT');
    req.flush(movement);
  });

  it('devolve os lançamentos excluídos para o desfazer', () => {
    let deleted: InvestmentMovement[] = [];
    api.delete(5).subscribe((rows) => (deleted = rows));
    http.expectOne('/transactions/5').flush({ deleted: [movement], closedSeries: [] });
    expect(deleted).toEqual([movement]);
  });

  it('restaura os lançamentos excluídos como vieram', () => {
    api.restore([movement]).subscribe();
    const req = http.expectOne('/transactions/restore');
    expect(req.request.body).toEqual({ transactions: [movement] });
    req.flush({ restored: [movement] });
  });
});
