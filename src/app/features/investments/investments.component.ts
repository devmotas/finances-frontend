import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { Transaction } from '../../core/models/finances.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import {
  InvestmentApiService,
  NormalizedInvestmentMonthView,
} from '../../core/services/investment-api.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { ToastService } from '../../core/services/toast.service';
import { httpErrorMessage } from '../../core/utils/http-error.util';
import { CategoryModalComponent } from '../../shared/components/category-modal/category-modal.component';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';

function investmentCategoryStackColors(
  index: number,
  total: number
): { bg: string; border: string } {
  const hue = Math.round((360 * index) / Math.max(total, 1)) % 360;
  return {
    bg: `hsla(${hue}, 58%, 48%, 0.82)`,
    border: `hsla(${hue}, 58%, 32%, 0.95)`,
  };
}

@Component({
  selector: 'app-investments',
  imports: [
    CurrencyPipe,
    LucideAngularModule,
    BaseChartDirective,
    CategoryModalComponent,
    TransactionModalComponent,
  ],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
})
export class InvestmentsComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly investmentApi = inject(InvestmentApiService);

  readonly categoryOpen = signal(false);
  readonly txOpen = signal(false);
  readonly editingTx = signal<Transaction | null>(null);
  readonly txInvestmentIntent = signal<'aporte' | 'resgate'>('aporte');
  readonly filterCategoryId = signal<number | null>(null);

  readonly apiMeta = signal<NormalizedInvestmentMonthView | null>(null);

  constructor() {
    combineLatest([
      toObservable(this.monthCtx.selectedMonth),
      toObservable(this.facade.transactions),
      toObservable(this.facade.categories),
    ])
      .pipe(
        switchMap(([ym]) =>
          this.investmentApi.getMonthView(ym.year, ym.month).pipe(
            map((raw) => this.investmentApi.normalizeMonthView(raw)),
            catchError(() => of(null))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((v) => this.apiMeta.set(v));
  }

  readonly list = computed(() => {
    const fid = this.filterCategoryId();
    const items = this.facade.monthTransactions().filter((t) => t.flow === 'investment');
    if (fid == null) return items;
    return items.filter((t) => t.categoryId === fid);
  });

  readonly monthInvested = computed(() => this.facade.monthTotals().totalInvestments);

  readonly positionBeforeMonth = computed(() => this.apiMeta()?.positionBeforeMonth ?? 0);

  readonly positionThroughMonthEnd = computed(() => this.apiMeta()?.positionThroughMonthEnd ?? 0);

  readonly chartLabels = computed(() => {
    const s = this.apiMeta()?.monthlySeries ?? [];
    return s.map((p) => {
      const label = p.displayLabel?.trim();
      if (label) return label;
      const d = new Date(p.year, p.month - 1, 1);
      return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    });
  });

  readonly useStackedInvestmentChart = computed(() => {
    const m = this.apiMeta();
    if (!m) return false;
    const cats = m.stackCategories;
    if (cats.length === 0) return false;
    return m.monthlySeries.every((row) => row.categoryAmounts.length === cats.length);
  });

  readonly evolutionChartData = computed((): ChartData<'bar'> => {
    const meta = this.apiMeta();
    const s = meta?.monthlySeries ?? [];
    const labels = this.chartLabels();
    const stacked = this.useStackedInvestmentChart();
    const cats = meta?.stackCategories ?? [];

    const lineDataset = {
      type: 'line' as const,
      label: 'Patrimônio acumulado',
      data: s.map((p) => p.cumulativeWealth),
      yAxisID: 'y1',
      borderColor: '#0b5d7a',
      backgroundColor: 'rgba(11, 93, 122, 0.08)',
      borderWidth: 2.5,
      tension: 0.25,
      pointRadius: 3,
      pointBackgroundColor: '#0b5d7a',
      order: 1,
      fill: false,
    };

    if (!stacked) {
      const barBg = s.map((p) =>
        p.displayLabel ? 'rgba(180, 83, 9, 0.55)' : 'rgba(91, 33, 182, 0.55)'
      );
      const barBorder = s.map((p) =>
        p.displayLabel ? 'rgba(146, 64, 14, 0.95)' : 'rgba(91, 33, 182, 0.95)'
      );
      return {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Total no período',
            data: s.map((p) => p.invested),
            yAxisID: 'y',
            backgroundColor: barBg,
            borderColor: barBorder,
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
            order: 2,
          },
          lineDataset,
        ],
      } as ChartData<'bar'>;
    }

    const barDatasets = cats.map((cat, idx) => {
      const { bg, border } = investmentCategoryStackColors(idx, cats.length);
      const short =
        cat.name.length > 26 ? `${cat.name.slice(0, 24).trimEnd()}…` : cat.name;
      return {
        type: 'bar' as const,
        label: short,
        data: s.map((row) => row.categoryAmounts[idx] ?? 0),
        yAxisID: 'y',
        stack: 'inv',
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 2,
        borderSkipped: false,
        order: 2,
      };
    });

    return {
      labels,
      datasets: [...barDatasets, lineDataset],
    } as ChartData<'bar'>;
  });

  readonly evolutionChartType = 'bar' as const;

  readonly evolutionChartOptions = computed((): ChartConfiguration<'bar'>['options'] => {
    const stacked = this.useStackedInvestmentChart();
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 10, font: { size: 10 }, color: '#475569' },
        },
        tooltip: {
          filter: (item) => {
            if (item.dataset.yAxisID === 'y1') return true;
            const v = item.raw as number;
            return Math.abs(Number(v)) > 1e-9;
          },
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw as number;
              const formatted = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(v);
              if (ctx.dataset.yAxisID === 'y1') {
                return `${ctx.dataset.label ?? 'Patrimônio'}: ${formatted}`;
              }
              return `${ctx.dataset.label ?? ''}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked,
          grid: { color: 'rgba(148, 163, 184, 0.22)' },
          ticks: {
            font: { size: 11 },
            color: '#64748b',
            maxRotation: 40,
            minRotation: 0,
          },
        },
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          stacked,
          title: {
            display: true,
            text: stacked ? 'Por categoria (R$)' : 'Valor da coluna (R$)',
            color: '#64748b',
            font: { size: 11 },
          },
          grid: { color: 'rgba(148, 163, 184, 0.22)' },
          ticks: {
            color: '#64748b',
            callback: (value) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
                notation: 'compact',
              }).format(Number(value)),
          },
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          stacked: false,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Patrimônio (R$)', color: '#64748b', font: { size: 11 } },
          ticks: {
            color: '#64748b',
            callback: (value) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
                notation: 'compact',
              }).format(Number(value)),
          },
        },
      },
    };
  });

  readonly categories = computed(() => this.facade.investmentCategories());

  readonly hasChartSeries = computed(() => (this.apiMeta()?.monthlySeries.length ?? 0) > 0);

  readonly categoryPositionTotals = computed(
    () => this.apiMeta()?.categoryTotalsThroughSelectedMonth ?? []
  );

  readonly selectedMonthTitleLabel = computed(() => {
    const { year, month } = this.monthCtx.selectedMonth();
    const d = new Date(year, month - 1, 1);
    const raw = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  categoryTotalAccent(index: number): string {
    const n = this.apiMeta()?.stackCategories.length ?? 1;
    return investmentCategoryStackColors(index, n).border;
  }

  openCategory(): void {
    this.categoryOpen.set(true);
  }

  closeCategory(): void {
    this.categoryOpen.set(false);
  }

  closeTx(): void {
    this.txOpen.set(false);
    this.editingTx.set(null);
    this.txInvestmentIntent.set('aporte');
  }

  editTx(t: Transaction): void {
    this.txInvestmentIntent.set(t.amount < 0 ? 'resgate' : 'aporte');
    this.editingTx.set(t);
    this.txOpen.set(true);
  }

  txHasRecurrence(t: Transaction): boolean {
    return t.schedule === 'fixed' && t.recurrenceId != null && t.recurrenceId > 0;
  }

  removeTx(t: Transaction): void {
    let applyToFutureSeries = false;
    if (this.txHasRecurrence(t)) {
      applyToFutureSeries = confirm(
        'Este lançamento faz parte de uma série fixa.\n\n' +
          'OK = Excluir este mês e todos os meses seguintes da série\n' +
          'Cancelar = Excluir somente este mês'
      );
    } else if (!confirm(t.amount < 0 ? 'Excluir este resgate?' : 'Excluir este aporte?')) {
      return;
    }
    this.facade.deleteTransaction(t.id, { applyToFutureSeries }).subscribe({
      next: () =>
        this.toast.show(t.amount < 0 ? 'Resgate excluído.' : 'Aporte excluído.', 'success'),
      error: (err: unknown) => {
        this.toast.show(httpErrorMessage(err, 'Não foi possível excluir.'), 'error');
      },
    });
  }

  selectAllFilter(): void {
    this.filterCategoryId.set(null);
  }

  toggleCategoryFilter(id: number): void {
    this.filterCategoryId.update((cur) => (cur === id ? null : id));
  }

  openNewTx(): void {
    if (this.facade.investmentCategories().length === 0) {
      this.toast.show('Crie uma categoria antes de registrar um aporte.', 'info');
      this.categoryOpen.set(true);
      return;
    }
    this.txInvestmentIntent.set('aporte');
    this.editingTx.set(null);
    this.txOpen.set(true);
  }

  openNewResgate(): void {
    if (this.facade.investmentCategories().length === 0) {
      this.toast.show('Crie uma categoria antes de registrar um resgate.', 'info');
      this.categoryOpen.set(true);
      return;
    }
    this.txInvestmentIntent.set('resgate');
    this.editingTx.set(null);
    this.txOpen.set(true);
  }
}
