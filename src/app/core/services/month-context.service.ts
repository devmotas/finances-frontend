import { Injectable, signal } from '@angular/core';

export interface YearMonth {
  year: number;
  month: number;
}

@Injectable({ providedIn: 'root' })
export class MonthContextService {
  private readonly selected = signal<YearMonth>(this.currentYearMonth());

  readonly selectedMonth = this.selected.asReadonly();

  private currentYearMonth(): YearMonth {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  prevMonth(): void {
    this.selected.update((ym) => {
      let { year, month } = ym;
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      return { year, month };
    });
  }

  nextMonth(): void {
    this.selected.update((ym) => {
      let { year, month } = ym;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
  }

  setMonth(year: number, month: number): void {
    this.selected.set({ year, month });
  }

  labelPtBr(): string {
    const { year, month } = this.selected();
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
}
