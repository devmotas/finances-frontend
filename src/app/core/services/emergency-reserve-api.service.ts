import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { EmergencyReserve } from '../models/investment-accounts.models';

interface SummaryReserveResponse {
  reserve: EmergencyReserve;
}

@Injectable({ providedIn: 'root' })
export class EmergencyReserveApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/finance/summary';

  get(year: number, month: number): Observable<EmergencyReserve> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http
      .get<SummaryReserveResponse>(this.base, { params })
      .pipe(map((res) => res.reserve));
  }
}
