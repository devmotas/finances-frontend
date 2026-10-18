import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SERIES_KIND, SeriesKind } from '../models/finances.models';

interface RecurrenceBaseDto {
  categoryId: number;
  description?: string | null;
  startDate: string;
}

export interface FixedRecurrenceCreateDto extends RecurrenceBaseDto {
  kind: typeof SERIES_KIND.fixed;
  amount: number;
  destinationAccountId?: number;
}

export interface InstallmentRecurrenceCreateDto extends RecurrenceBaseDto {
  kind: typeof SERIES_KIND.installment;
  installments: number;
  amount?: number;
  totalAmount?: number;
}

export type RecurrenceCreateDto = FixedRecurrenceCreateDto | InstallmentRecurrenceCreateDto;

export interface SeriesDto {
  id: number;
  kind: SeriesKind;
  categoryId: number;
  description: string | null;
  amount: number;
  startDate: string;
  endMonth: string | null;
  installmentTotal: number | null;
  destinationAccountId: number | null;
}

export interface RecurrenceCreatedDto {
  recurrenceId: number;
  createdCount: number;
  series: SeriesDto;
}

@Injectable({ providedIn: 'root' })
export class RecurrenceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/recurrences';

  create(dto: RecurrenceCreateDto): Observable<RecurrenceCreatedDto> {
    return this.http.post<RecurrenceCreatedDto>(this.base, dto);
  }
}
