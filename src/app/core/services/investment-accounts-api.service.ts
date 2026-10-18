import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BalanceUpdateCreateDto,
  BalanceUpdateDto,
  InvestmentAccountRecord,
  InvestmentAccountSaveDto,
} from '../models/investment-accounts.models';

@Injectable({ providedIn: 'root' })
export class InvestmentAccountsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/investment-accounts';

  create(dto: InvestmentAccountSaveDto): Observable<InvestmentAccountRecord> {
    return this.http.post<InvestmentAccountRecord>(this.base, dto);
  }

  update(id: number, dto: InvestmentAccountSaveDto): Observable<InvestmentAccountRecord> {
    return this.http.put<InvestmentAccountRecord>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addBalanceUpdate(accountId: number, dto: BalanceUpdateCreateDto): Observable<BalanceUpdateDto> {
    return this.http.post<BalanceUpdateDto>(`${this.base}/${accountId}/balance-updates`, dto);
  }
}
