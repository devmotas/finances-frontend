import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ACCOUNT_ROLE, InvestmentAccountSaveDto } from '../models/investment-accounts.models';
import { InvestmentAccountsApiService } from './investment-accounts-api.service';

describe('InvestmentAccountsApiService', () => {
  let api: InvestmentAccountsApiService;
  let http: HttpTestingController;

  const dto: InvestmentAccountSaveDto = {
    name: 'Caixinha',
    role: ACCOUNT_ROLE.shortTermReserve,
    initialBalance: 1000,
    initialBalanceDate: '2026-10-01',
    targetBalance: 2000,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(InvestmentAccountsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista as contas com GET /investment-accounts', () => {
    let names: string[] = [];
    api.list().subscribe((accounts) => (names = accounts.map((a) => a.name)));
    const req = http.expectOne('/investment-accounts');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, ...dto }]);
    expect(names).toEqual(['Caixinha']);
  });

  it('cria a conta com POST /investment-accounts', () => {
    api.create(dto).subscribe();
    const req = http.expectOne('/investment-accounts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 1, ...dto });
  });

  it('edita a conta com PUT /investment-accounts/:id', () => {
    api.update(7, dto).subscribe();
    const req = http.expectOne('/investment-accounts/7');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 7, ...dto });
  });

  it('exclui a conta com DELETE /investment-accounts/:id', () => {
    api.delete(7).subscribe();
    const req = http.expectOne('/investment-accounts/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('registra a atualização de saldo e devolve o rendimento', () => {
    let resultYield: number | undefined;
    api.addBalanceUpdate(20, { date: '2026-10-31', balance: 30210.55 }).subscribe((u) => (resultYield = u.yield));
    const req = http.expectOne('/investment-accounts/20/balance-updates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date: '2026-10-31', balance: 30210.55 });
    req.flush({ id: 7, investmentAccountId: 20, date: '2026-10-31', balance: 30210.55, yield: 325.74 });
    expect(resultYield).toBe(325.74);
  });
});
