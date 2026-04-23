import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Transaction, TransactionCreateDto } from '../models/finances.models';
import { TransactionApiDto, mapTransactionApiDto } from '../utils/api-mappers';

@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/transactions';

  getByMonth(year: number, month: number): Observable<Transaction[]> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http
      .get<TransactionApiDto[]>(this.base, { params })
      .pipe(map((rows) => rows.map(mapTransactionApiDto)));
  }

  create(dto: TransactionCreateDto): Observable<Transaction> {
    return this.http.post<TransactionApiDto>(this.base, dto).pipe(map(mapTransactionApiDto));
  }

  update(
    id: number,
    dto: TransactionCreateDto,
    applyToFutureSeries = false
  ): Observable<Transaction> {
    const params = new HttpParams().set('applyToFutureSeries', String(applyToFutureSeries));
    return this.http
      .put<TransactionApiDto>(`${this.base}/${id}`, dto, { params })
      .pipe(map(mapTransactionApiDto));
  }

  delete(id: number, applyToFutureSeries = false): Observable<void> {
    const params = new HttpParams().set('applyToFutureSeries', String(applyToFutureSeries));
    return this.http.delete<void>(`${this.base}/${id}`, { params });
  }
}
