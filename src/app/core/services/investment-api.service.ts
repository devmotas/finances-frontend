import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface InvestmentSummaryDto {
  monthTotal: number | string;
  accumulatedBeforeMonth: number | string;
  totalThroughMonthEnd: number | string;
  openingBalanceTotal?: number | string | null;
  positionBeforeMonth?: number | string | null;
  positionThroughMonthEnd?: number | string | null;
}

export interface InvestmentMonthPointDto {
  year: number;
  month: number;
  invested: number | string;
  cumulativeWealth: number | string;
  displayLabel?: string | null;
  categoryAmounts?: (number | string)[] | null;
}

export interface InvestmentStackCategoryDto {
  id: number;
  name: string;
}

export interface InvestmentCategoryTotalDto {
  categoryId: number;
  name: string;
  totalThroughMonthEnd: number | string;
}

export interface InvestmentMonthViewDto {
  summary: InvestmentSummaryDto;
  monthlySeries: InvestmentMonthPointDto[];
  stackCategories?: InvestmentStackCategoryDto[] | null;
  categoryTotalsThroughSelectedMonth?: InvestmentCategoryTotalDto[] | null;
  transactions?: unknown;
}

export interface NormalizedInvestmentMonthView {
  monthTotal: number;
  accumulatedBeforeMonth: number;
  totalThroughMonthEnd: number;
  openingBalanceTotal: number;
  positionBeforeMonth: number;
  positionThroughMonthEnd: number;
  stackCategories: InvestmentStackCategoryDto[];
  categoryTotalsThroughSelectedMonth: {
    categoryId: number;
    name: string;
    totalThroughMonthEnd: number;
  }[];
  monthlySeries: {
    year: number;
    month: number;
    invested: number;
    cumulativeWealth: number;
    displayLabel?: string | null;
    categoryAmounts: number[];
  }[];
}

function asNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

@Injectable({ providedIn: 'root' })
export class InvestmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/investments';

  getMonthView(year: number, month: number): Observable<InvestmentMonthViewDto> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<InvestmentMonthViewDto>(this.base, { params });
  }

  normalizeMonthView(raw: InvestmentMonthViewDto): NormalizedInvestmentMonthView {
    const before = asNum(raw.summary.accumulatedBeforeMonth);
    const month = asNum(raw.summary.monthTotal);
    const total =
      raw.summary.totalThroughMonthEnd !== undefined && raw.summary.totalThroughMonthEnd !== null
        ? asNum(raw.summary.totalThroughMonthEnd)
        : before + month;
    const opening = asNum(raw.summary.openingBalanceTotal);
    const positionBefore =
      raw.summary.positionBeforeMonth !== undefined && raw.summary.positionBeforeMonth !== null
        ? asNum(raw.summary.positionBeforeMonth)
        : opening + before;
    const positionEnd =
      raw.summary.positionThroughMonthEnd !== undefined && raw.summary.positionThroughMonthEnd !== null
        ? asNum(raw.summary.positionThroughMonthEnd)
        : opening + total;
    const stackCategories = (raw.stackCategories ?? []).map((c) => {
      const id =
        typeof c.id === 'number' && Number.isFinite(c.id)
          ? c.id
          : Number(String(c.id ?? '').replace(/\D/g, '')) || 0;
      return {
        id,
        name: (c.name ?? '').trim() || `Categoria ${id}`,
      };
    });

    const categoryTotalsThroughSelectedMonth = (raw.categoryTotalsThroughSelectedMonth ?? []).map((r) => {
      const categoryId =
        typeof r.categoryId === 'number' && Number.isFinite(r.categoryId)
          ? r.categoryId
          : Number(String(r.categoryId ?? '').replace(/\D/g, '')) || 0;
      return {
        categoryId,
        name: (r.name ?? '').trim() || `Categoria ${categoryId}`,
        totalThroughMonthEnd: asNum(r.totalThroughMonthEnd),
      };
    });

    return {
      monthTotal: month,
      accumulatedBeforeMonth: before,
      totalThroughMonthEnd: total,
      openingBalanceTotal: opening,
      positionBeforeMonth: positionBefore,
      positionThroughMonthEnd: positionEnd,
      stackCategories,
      categoryTotalsThroughSelectedMonth,
      monthlySeries: raw.monthlySeries.map((p) => ({
        year: p.year,
        month: p.month,
        invested: asNum(p.invested),
        cumulativeWealth: asNum(p.cumulativeWealth),
        displayLabel: p.displayLabel?.trim() ? p.displayLabel.trim() : null,
        categoryAmounts: (p.categoryAmounts ?? []).map((x) => asNum(x)),
      })),
    };
  }
}
