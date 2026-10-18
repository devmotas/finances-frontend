import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ReserveSummaryDto {
  amount: number;
  referenceExpense: number | null;
  coverageMonths: number | null;
  targetMonths: number;
  shortTermBalance: number;
  shortTermTarget: number | null;
  shortTermMissing: number | null;
}

export interface NextMonthSummaryDto {
  year: number;
  month: number;
  committedIncome: number;
  committedEssential: number;
  committedNonEssential: number;
  committedInvestment: number;
  expectedWalletSpending: number;
  projectedBalance: number;
}

export interface FinanceSummaryDto {
  year: number;
  month: number;
  totalIncome: number;
  totalEssential: number;
  totalNonEssential: number;
  totalExpenses: number;
  totalContributions: number;
  totalWithdrawals: number;
  netInvested: number;
  monthBalance: number;
  cashBalance: number;
  ledgerBalance: number;
  walletBalance: number;
  investedPosition: number;
  investedYield: number;
  investedBookValue: number;
  reserve: ReserveSummaryDto;
  nextMonth: NextMonthSummaryDto;
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
