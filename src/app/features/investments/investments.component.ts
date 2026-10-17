import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, distinctUntilChanged, filter, map, merge, of, switchMap, tap } from 'rxjs';
import { Flow, Transaction } from '../../core/models/finances.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import {
  InvestmentApiService,
  InvestmentMonthViewDto,
} from '../../core/services/investment-api.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { ToastService } from '../../core/services/toast.service';
import { httpErrorMessage } from '../../core/utils/http-error.util';
import { isSeriesTransaction } from '../../core/utils/transaction-series';
import { CategoryModalComponent } from '../../shared/components/category-modal/category-modal.component';
import { SeriesDeleteModalComponent } from '../../shared/components/series-delete-modal/series-delete-modal.component';
import { TransactionDeletion } from '../../shared/components/series-delete-modal/transaction-deletion';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';
import { MonthLoadErrorComponent } from '../../shared/components/month-load-error/month-load-error.component';
import { MonthLoadingComponent } from '../../shared/components/month-loading/month-loading.component';
import { CHART_SEGMENT_BORDER, cssToken, flowShade, formatCompactBrl } from '../../shared/charts/chart-theme';

const INITIAL_BALANCE_SHADE = 3;
const MONTH_SHADE = 0;

const INVESTMENT_FLOW: Flow = 'investment';

function isWithdrawal(t: Transaction): boolean {
  return t.amount < 0;
}

@Component({
  selector: 'app-investments',
  imports: [
    CurrencyPipe,
    LucideAngularModule,
    BaseChartDirective,
    CategoryModalComponent,
    TransactionModalComponent,
    SeriesDeleteModalComponent,
    MonthLoadErrorComponent,
    MonthLoadingComponent,
  ],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
})
export class InvestmentsComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  readonly deletion = new TransactionDeletion(this.facade, this.toast, {
    itemLabel: (t) => (isWithdrawal(t) ? 'este resgate' : 'este aporte'),
    deletedMessage: (t) => (isWithdrawal(t) ? 'Resgate excluído.' : 'Aporte excluído.'),
  });
  private readonly monthCtx = inject(MonthContextService);
  private readonly investmentApi = inject(InvestmentApiService);

  readonly categoryOpen = signal(false);
  readonly txOpen = signal(false);
  readonly editingTx = signal<Transaction | null>(null);
  readonly txInvestmentIntent = signal<'aporte' | 'resgate'>('aporte');
  readonly filterCategoryId = signal<number | null>(null);

  readonly apiMeta = signal<InvestmentMonthViewDto | null>(null);

  constructor() {
    const monthChanges$ = toObservable(this.monthCtx.selectedMonth).pipe(
      distinctUntilChanged((a, b) => a.year === b.year && a.month === b.month),
      tap(() => this.apiMeta.set(null))
    );
    const investmentChanges$ = this.facade.dataChanged$.pipe(
      filter((flow) => flow === INVESTMENT_FLOW),
      map(() => this.monthCtx.selectedMonth())
    );

    merge(monthChanges$, investmentChanges$)
      .pipe(
        switchMap((ym) =>
          this.investmentApi.getMonthView(ym.year, ym.month).pipe(catchError(() => of(null)))
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

  readonly positionBeforeMonth = computed(() => this.apiMeta()?.summary.positionBeforeMonth ?? null);

  readonly positionThroughMonthEnd = computed(() => this.apiMeta()?.summary.positionThroughMonthEnd ?? null);

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
      borderColor: cssToken('--fin-investment-hover'),
      backgroundColor: cssToken('--fin-investment-hover'),
      borderWidth: 2.5,
      tension: 0.25,
      pointRadius: 3,
      pointBackgroundColor: cssToken('--fin-investment-hover'),
      order: 1,
      fill: false,
    };

    if (!stacked) {
      const barBg = s.map((p) =>
        flowShade('investment', p.displayLabel ? INITIAL_BALANCE_SHADE : MONTH_SHADE)
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
            borderColor: CHART_SEGMENT_BORDER,
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
      const short =
        cat.name.length > 26 ? `${cat.name.slice(0, 24).trimEnd()}…` : cat.name;
      return {
        type: 'bar' as const,
        label: short,
        data: s.map((row) => row.categoryAmounts[idx] ?? 0),
        yAxisID: 'y',
        stack: 'inv',
        backgroundColor: flowShade('investment', idx),
        borderColor: CHART_SEGMENT_BORDER,
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
          labels: { boxWidth: 10, font: { size: 10 }, color: cssToken('--fin-text-secondary') },
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
          grid: { color: cssToken('--fin-border') },
          ticks: {
            font: { size: 11 },
            color: cssToken('--fin-text-muted'),
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
            color: cssToken('--fin-text-muted'),
            font: { size: 11 },
          },
          grid: { color: cssToken('--fin-border') },
          ticks: {
            color: cssToken('--fin-text-muted'),
            callback: (value) => formatCompactBrl(Number(value)),
          },
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          stacked: false,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Patrimônio (R$)', color: cssToken('--fin-text-muted'), font: { size: 11 } },
          ticks: {
            color: cssToken('--fin-text-muted'),
            callback: (value) => formatCompactBrl(Number(value)),
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
    return flowShade('investment', index);
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
    this.txInvestmentIntent.set(isWithdrawal(t) ? 'resgate' : 'aporte');
    this.editingTx.set(t);
    this.txOpen.set(true);
  }

  txHasRecurrence(t: Transaction): boolean {
    return isSeriesTransaction(t);
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
