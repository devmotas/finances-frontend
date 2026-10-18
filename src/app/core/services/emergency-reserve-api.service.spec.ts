import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EmergencyReserve } from '../models/investment-accounts.models';
import { EmergencyReserveApiService } from './emergency-reserve-api.service';

describe('EmergencyReserveApiService', () => {
  it('lê os campos da reserva do resumo do mês', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(EmergencyReserveApiService);
    const http = TestBed.inject(HttpTestingController);
    const reserve: EmergencyReserve = {
      amount: 29884.81,
      referenceExpense: 1098.48,
      coverageMonths: 27.21,
      targetMonths: 6,
      shortTermBalance: 0,
      shortTermTarget: null,
      shortTermMissing: null,
    };

    let result: EmergencyReserve | undefined;
    api.get(2026, 10).subscribe((r) => (result = r));
    const req = http.expectOne((r) => r.url === '/finance/summary');
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.get('month')).toBe('10');
    req.flush({ year: 2026, month: 10, cashBalance: 166.5, reserve });

    expect(result).toEqual(reserve);
    http.verify();
  });
});
