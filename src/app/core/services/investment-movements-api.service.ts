import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { InvestmentMovement, InvestmentMovementSaveDto } from '../models/investment-accounts.models';

interface DeletedMovementsResponse {
  deleted: InvestmentMovement[];
}

interface RestoredMovementsResponse {
  restored: InvestmentMovement[];
}

@Injectable({ providedIn: 'root' })
export class InvestmentMovementsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/transactions';

  create(dto: InvestmentMovementSaveDto): Observable<InvestmentMovement> {
    return this.http.post<InvestmentMovement>(this.base, dto);
  }

  update(id: number, dto: InvestmentMovementSaveDto): Observable<InvestmentMovement> {
    return this.http.put<InvestmentMovement>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<InvestmentMovement[]> {
    return this.http
      .delete<DeletedMovementsResponse>(`${this.base}/${id}`)
      .pipe(map((res) => res.deleted));
  }

  restore(movements: InvestmentMovement[]): Observable<InvestmentMovement[]> {
    return this.http
      .post<RestoredMovementsResponse>(`${this.base}/restore`, { transactions: movements })
      .pipe(map((res) => res.restored));
  }
}
