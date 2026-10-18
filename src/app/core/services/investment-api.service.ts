import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InvestmentMonthView } from '../models/investment-accounts.models';

@Injectable({ providedIn: 'root' })
export class InvestmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/investments';

  getMonthView(year: number, month: number): Observable<InvestmentMonthView> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<InvestmentMonthView>(this.base, { params });
  }
}
