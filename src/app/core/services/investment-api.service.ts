import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface InvestmentSummaryDto {
  monthTotal: number;
  accumulatedBeforeMonth: number;
  totalThroughMonthEnd: number;
  openingBalanceTotal: number;
  positionBeforeMonth: number;
  positionThroughMonthEnd: number;
}

export interface InvestmentMonthPointDto {
  year: number;
  month: number;
  invested: number;
  cumulativeWealth: number;
  displayLabel: string | null;
  categoryAmounts: number[];
}

export interface InvestmentStackCategoryDto {
  id: number;
  name: string;
}

export interface InvestmentCategoryTotalDto {
  categoryId: number;
  name: string;
  totalThroughMonthEnd: number;
}

export interface InvestmentMonthViewDto {
  summary: InvestmentSummaryDto;
  monthlySeries: InvestmentMonthPointDto[];
  stackCategories: InvestmentStackCategoryDto[];
  categoryTotalsThroughSelectedMonth: InvestmentCategoryTotalDto[];
}

@Injectable({ providedIn: 'root' })
export class InvestmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/investments';

  getMonthView(year: number, month: number): Observable<InvestmentMonthViewDto> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<InvestmentMonthViewDto>(this.base, { params });
  }
}
