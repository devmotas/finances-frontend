import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface FinanceSummaryDto {
  year: number;
  month: number;
  accumulatedBalance: number;
  openingBalanceAmount: number;
  monthExpenseTotal: number;
  cumulativeInvestmentContributions: number;
  totalEmergencyReserve: number;
  emergencyFundTargetMonths: number;
  monthsOfReserveCovered: number | null;
}

@Injectable({ providedIn: 'root' })
export class FinanceSummaryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/finance/summary';

  get(year: number, month: number): Observable<FinanceSummaryDto> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<FinanceSummaryDto>(this.base, { params });
  }
}
