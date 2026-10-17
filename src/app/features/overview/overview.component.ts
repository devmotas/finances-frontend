import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LucideAngularModule } from 'lucide-angular';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Category, Transaction } from '../../core/models/finances.models';
import { AuthTokenService } from '../../core/services/auth-token.service';
import {
  FinanceSummaryApiService,
  FinanceSummaryDto,
} from '../../core/services/finance-summary-api.service';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { categoryMap } from '../../core/utils/finance-calculations';
import { MonthLoadErrorComponent } from '../../shared/components/month-load-error/month-load-error.component';
import { MonthLoadingComponent } from '../../shared/components/month-loading/month-loading.component';
import { CHART_SEGMENT_BORDER, cssToken, flowShade, formatCompactBrl } from '../../shared/charts/chart-theme';

const ROW_LABELS = [
  'Entradas',
  'Despesas essenciais',
  'Despesas não essenciais',
  'Investimentos',
  'Composição das despesas',
] as const;

function categoryStackBackgrounds(categoryIndex: number): string[] {
  return [
    flowShade('income', categoryIndex),
    flowShade('essential', categoryIndex),
    flowShade('nonEssential', categoryIndex),
    flowShade('investment', categoryIndex),
    'transparent',
  ];
}

function categoryStackBorders(): string[] {
  const b = CHART_SEGMENT_BORDER;
  return [b, b, b, b, 'transparent'];
}

function buildStackedBarData(
  categories: Category[],
  monthTx: Transaction[],
  totalEssential: number,
  totalNonEssential: number
): ChartData<'bar'> {
  const catById = categoryMap(categories);
  const byCat = new Map<number, { i: number; e: number; ne: number; inv: number }>();

  for (const t of monthTx) {
    const cat = catById.get(t.categoryId);
    if (!cat) continue;
    if (!byCat.has(t.categoryId)) {
      byCat.set(t.categoryId, { i: 0, e: 0, ne: 0, inv: 0 });
    }
    const b = byCat.get(t.categoryId)!;
    if (t.flow === 'income') {
      b.i += t.amount;
    } else if (t.flow === 'investment') {
      b.inv += t.amount;
    } else if (cat.flow === 'expense') {
      if (cat.expenseGroup === 'essential') b.e += t.amount;
      else if (cat.expenseGroup === 'nonEssential') b.ne += t.amount;
    }
  }

  const slices = categories
    .map((c) => {
      const b = byCat.get(c.id) ?? { i: 0, e: 0, ne: 0, inv: 0 };
      return { cat: c, ...b, sum: b.i + b.e + b.ne + b.inv };
    })
    .filter((s) => s.sum > 0)
    .sort((a, b) => b.sum - a.sum);

  const datasets = slices.map((s, idx) => ({
    label: s.cat.name,
    data: [s.i, s.e, s.ne, s.inv, 0],
    backgroundColor: categoryStackBackgrounds(idx),
    borderColor: categoryStackBorders(),
    borderWidth: 1,
    borderRadius: 4,
    borderSkipped: false as const,
  }));

  datasets.push(
    {
      label: 'Essenciais (total)',
      data: [0, 0, 0, 0, totalEssential],
      backgroundColor: [
        'transparent',
        'transparent',
        'transparent',
        'transparent',
        cssToken('--fin-essential'),
      ],
      borderColor: [
        'transparent',
        'transparent',
        'transparent',
        'transparent',
        CHART_SEGMENT_BORDER,
      ],
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false as const,
    },
    {
      label: 'Não essenciais (total)',
      data: [0, 0, 0, 0, totalNonEssential],
      backgroundColor: [
        'transparent',
        'transparent',
        'transparent',
        'transparent',
        cssToken('--fin-expense'),
      ],
      borderColor: [
        'transparent',
        'transparent',
        'transparent',
        'transparent',
        CHART_SEGMENT_BORDER,
      ],
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false as const,
    }
  );

  return {
    labels: [...ROW_LABELS],
    datasets,
  };
}

@Component({
  selector: 'app-overview',
  imports: [CurrencyPipe, LucideAngularModule, BaseChartDirective, MonthLoadErrorComponent, MonthLoadingComponent],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  readonly facade = inject(FinancesFacadeService);
  private readonly summaryApi = inject(FinanceSummaryApiService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly tokens = inject(AuthTokenService);
  private readonly destroyRef = inject(DestroyRef);

  readonly financeSummary = signal<FinanceSummaryDto | null>(null);

  readonly totals = computed(() => this.facade.monthTotals());

  readonly hasData = computed(() => {
    const t = this.totals();
    return t.totalIncome > 0 || t.totalExpenses > 0 || t.totalInvestments > 0;
  });

  readonly overviewChartData = computed((): ChartData<'bar'> => {
    const t = this.totals();
    return buildStackedBarData(
      this.facade.categories(),
      this.facade.monthTransactions(),
      t.totalEssential,
      t.totalNonEssential
    );
  });

  readonly overviewChartType = 'bar' as const;

  readonly overviewChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: true,
      axis: 'y',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: true,
        axis: 'y',
        filter: (item) => (item.raw as number) > 0,
        callbacks: {
          label: (ctx) => {
            const value = ctx.raw as number;
            const idx = ctx.dataIndex;
            const datasets = ctx.chart.data.datasets;
            let total = 0;
            for (const ds of datasets) {
              const v = ds.data[idx];
              if (typeof v === 'number') total += v;
            }
            const pct =
              total > 0
                ? new Intl.NumberFormat('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }).format((value / total) * 100)
                : '0';
            const formatted = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value);
            const name = ctx.dataset.label ?? '';
            return `${name}: ${formatted} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        grid: { color: cssToken('--fin-border') },
        ticks: {
          font: { size: 11 },
          color: cssToken('--fin-text-muted'),
          callback: (value) => formatCompactBrl(Number(value)),
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: {
          font: { size: 12, weight: 600 },
          color: cssToken('--fin-text-secondary'),
        },
      },
    },
  };

  constructor() {
    combineLatest([toObservable(this.monthCtx.selectedMonth), toObservable(this.tokens.hasToken)])
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a[0].year === b[0].year && a[0].month === b[0].month && a[1] === b[1]
        ),
        tap(([, has]) => {
          if (!has) this.financeSummary.set(null);
        }),
        filter(([, has]) => has),
        map(([ym]) => ym),
        tap(() => this.financeSummary.set(null)),
        switchMap((ym) =>
          this.summaryApi.get(ym.year, ym.month).pipe(catchError(() => of(null as FinanceSummaryDto | null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((s) => this.financeSummary.set(s));
  }
}
