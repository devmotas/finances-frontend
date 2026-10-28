import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LucideAngularModule } from 'lucide-angular';
import { Category, Transaction } from '../../core/models/finances.models';
import { FinanceSummaryDto } from '../../core/services/finance-summary-api.service';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { categoryMap, isWithdrawal } from '../../core/utils/finance-calculations';
import { MonthLoadErrorComponent } from '../../shared/components/month-load-error/month-load-error.component';
import { MonthLoadingComponent } from '../../shared/components/month-loading/month-loading.component';
import {
  CHART_SEGMENT_BORDER,
  ChartFlow,
  cssToken,
  flowShade,
  formatCompactBrl,
} from '../../shared/charts/chart-theme';
import { formatBrl } from '../../core/utils/brl-format';
import { closingStatus, meterWidths, walletPlanStatus } from '../../core/utils/month-closing';

type FlowAmounts = Record<ChartFlow, number>;

interface CategorySlice extends FlowAmounts {
  name: string;
  sum: number;
}

interface ChartTableItem {
  name: string;
  value: number;
  share: number;
}

interface ChartTableRow {
  label: string;
  total: number;
  items: ChartTableItem[];
}

const FLOW_ROWS: readonly { flow: ChartFlow; label: string }[] = [
  { flow: 'income', label: 'Entradas' },
  { flow: 'essential', label: 'Saídas essenciais' },
  { flow: 'nonEssential', label: 'Saídas não essenciais' },
  { flow: 'investment', label: 'Aportes' },
];

const COMPOSITION_ROW_LABEL = 'Composição das saídas';

const MONTH_NAME_FORMAT: Intl.DateTimeFormatOptions = { month: 'long' };
const LOCALE = 'pt-BR';

function monthName(year: number, month: number): string {
  const raw = new Date(year, month - 1, 1).toLocaleDateString(LOCALE, MONTH_NAME_FORMAT);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function hasMonthActivity(s: FinanceSummaryDto): boolean {
  return s.totalIncome > 0 || s.totalExpenses > 0 || s.totalContributions > 0 || s.totalWithdrawals > 0;
}

const ROW_LABELS = [...FLOW_ROWS.map((row) => row.label), COMPOSITION_ROW_LABEL];

function emptyFlowAmounts(): FlowAmounts {
  return { income: 0, essential: 0, nonEssential: 0, investment: 0 };
}

function categoryStackBackgrounds(categoryIndex: number): string[] {
  return [...FLOW_ROWS.map((row) => flowShade(row.flow, categoryIndex)), 'transparent'];
}

function categoryStackBorders(): string[] {
  return [...FLOW_ROWS.map(() => CHART_SEGMENT_BORDER), 'transparent'];
}

function buildCategorySlices(categories: Category[], monthTx: Transaction[]): CategorySlice[] {
  const catById = categoryMap(categories);
  const byCat = new Map<number, FlowAmounts>();

  for (const t of monthTx) {
    const cat = catById.get(t.categoryId);
    if (!cat) continue;
    if (!byCat.has(t.categoryId)) {
      byCat.set(t.categoryId, emptyFlowAmounts());
    }
    const b = byCat.get(t.categoryId)!;
    if (t.flow === 'income') {
      b.income += t.amount;
    } else if (t.flow === 'investment') {
      if (!isWithdrawal(t)) b.investment += t.amount;
    } else if (cat.flow === 'expense') {
      if (cat.expenseGroup === 'essential') b.essential += t.amount;
      else if (cat.expenseGroup === 'nonEssential') b.nonEssential += t.amount;
    }
  }

  return categories
    .map((c) => {
      const b = byCat.get(c.id) ?? emptyFlowAmounts();
      return { name: c.name, ...b, sum: b.income + b.essential + b.nonEssential + b.investment };
    })
    .filter((s) => s.sum > 0)
    .sort((a, b) => b.sum - a.sum);
}

function buildChartTableRows(slices: CategorySlice[]): ChartTableRow[] {
  return FLOW_ROWS.map(({ flow, label }) => {
    const total = slices.reduce((acc, slice) => acc + slice[flow], 0);
    const items = slices
      .filter((slice) => slice[flow] > 0)
      .sort((a, b) => b[flow] - a[flow])
      .map((slice) => ({ name: slice.name, value: slice[flow], share: slice[flow] / total }));
    return { label, total, items };
  });
}

function buildStackedBarData(
  slices: CategorySlice[],
  totalEssential: number,
  totalNonEssential: number
): ChartData<'bar'> {
  const datasets = slices.map((s, idx) => ({
    label: s.name,
    data: [...FLOW_ROWS.map((row) => s[row.flow]), 0],
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
  imports: [CurrencyPipe, PercentPipe, LucideAngularModule, BaseChartDirective, MonthLoadErrorComponent, MonthLoadingComponent],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  readonly facade = inject(FinancesFacadeService);
  private readonly monthCtx = inject(MonthContextService);

  readonly summary = this.facade.summary;

  readonly selectedMonthName = computed(() => {
    const { year, month } = this.monthCtx.selectedMonth();
    return monthName(year, month);
  });

  readonly previousMonthName = computed(() => {
    const { year, month } = this.monthCtx.selectedMonth();
    return monthName(year, month - 1);
  });

  readonly closing = computed(() => {
    const s = this.summary();
    return s ? closingStatus(s.monthClosing.balance) : null;
  });

  readonly walletPlan = computed(() => {
    const next = this.summary()?.nextMonth;
    return next ? walletPlanStatus(next.availableForWallet, next.plannedWalletTransfer) : null;
  });

  readonly walletMeter = computed(() => {
    const next = this.summary()?.nextMonth;
    return next ? meterWidths(next.availableForWallet, next.plannedWalletTransfer) : null;
  });

  readonly nextMonthName = computed(() => {
    const next = this.summary()?.nextMonth;
    return next ? monthName(next.year, next.month) : '';
  });

  readonly hasData = computed(() => {
    const s = this.summary();
    return s !== null && hasMonthActivity(s);
  });

  private readonly categorySlices = computed(() =>
    buildCategorySlices(this.facade.categories(), this.facade.monthTransactions())
  );

  readonly overviewChartData = computed((): ChartData<'bar'> => {
    const t = this.facade.monthTotals();
    return buildStackedBarData(this.categorySlices(), t.totalEssential, t.totalNonEssential);
  });

  readonly chartTableRows = computed(() => buildChartTableRows(this.categorySlices()));

  readonly chartSummaryLabel = computed(() => {
    const totalsText = this.chartTableRows()
      .map((row) => `${row.label}: ${formatBrl(row.total)}`)
      .join('; ');
    return `Gráfico de barras do resumo do mês. ${totalsText}. Valores por categoria na tabela abaixo do gráfico.`;
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
            const formatted = formatBrl(value);
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
}
