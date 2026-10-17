import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface RecurrenceCreateDto {
  categoryId: number;
  description?: string | null;
  amount: number;
  startDate: string;
  months: number;
  installmentTotal?: number | null;
}

export interface RecurrenceCreatedDto {
  recurrenceId: number;
  createdCount: number;
}

@Injectable({ providedIn: 'root' })
export class RecurrenceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/recurrences';

  create(dto: RecurrenceCreateDto): Observable<RecurrenceCreatedDto> {
    return this.http.post<RecurrenceCreatedDto>(this.base, dto);
  }
}
