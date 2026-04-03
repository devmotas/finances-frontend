import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LucideAngularModule } from 'lucide-angular';
import { Category, Transaction } from '../../core/models/finances.models';
import { categoryMap } from '../../core/utils/finance-calculations';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';

const ROW_LABELS = [
  'Entradas',
  'Despesas essenciais',
  'Despesas não essenciais',
  'Composição das despesas',
] as const;

/** Alinhado ao tema (--fin-essential / --fin-expense) */
const COMPOSITION_ESSENTIAL_BG = '#c2410c';
const COMPOSITION_NON_ESSENTIAL_BG = '#c81e1e';

function categoryBarColor(index: number): string {
  const h = (index * 47 + 28) % 360;
  return `hsl(${h} 52% 44%)`;
}

function buildStackedBarData(
  categories: Category[],
  monthTx: Transaction[],
  totalEssential: number,
  totalNonEssential: number
): ChartData<'bar'> {
  const catById = categoryMap(categories);
  const byCat = new Map<string, { i: number; e: number; ne: number }>();

  for (const t of monthTx) {
    const cat = catById.get(t.categoryId);
    if (!cat) continue;
    if (!byCat.has(t.categoryId)) {
      byCat.set(t.categoryId, { i: 0, e: 0, ne: 0 });
    }
    const b = byCat.get(t.categoryId)!;
    if (t.flow === 'income') {
      b.i += t.amount;
    } else if (cat.flow === 'expense') {
      if (cat.expenseGroup === 'essential') b.e += t.amount;
      else if (cat.expenseGroup === 'nonEssential') b.ne += t.amount;
    }
  }

  const slices = categories
    .map((c) => {
      const b = byCat.get(c.id) ?? { i: 0, e: 0, ne: 0 };
      return { cat: c, ...b, sum: b.i + b.e + b.ne };
    })
    .filter((s) => s.sum > 0)
    .sort((a, b) => b.sum - a.sum);

  const datasets = slices.map((s, idx) => ({
    label: s.cat.name,
    data: [s.i, s.e, s.ne, 0],
    backgroundColor: categoryBarColor(idx),
    borderWidth: 0,
    borderRadius: 4,
    borderSkipped: false as const,
  }));

  datasets.push(
    {
      label: 'Essenciais (total)',
      data: [0, 0, 0, totalEssential],
      backgroundColor: COMPOSITION_ESSENTIAL_BG,
      borderWidth: 0,
      borderRadius: 4,
      borderSkipped: false as const,
    },
    {
      label: 'Não essenciais (total)',
      data: [0, 0, 0, totalNonEssential],
      backgroundColor: COMPOSITION_NON_ESSENTIAL_BG,
      borderWidth: 0,
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
  imports: [CurrencyPipe, LucideAngularModule, BaseChartDirective],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  readonly facade = inject(FinancesFacadeService);

  readonly totals = computed(() => this.facade.monthTotals());

  readonly hasData = computed(() => {
    const t = this.totals();
    return t.totalIncome > 0 || t.totalExpenses > 0;
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
    // Só reage ao passar em cima da barra daquela linha — evita trocar de linha com o mouse entre faixas
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
        grid: { color: 'rgba(148, 163, 184, 0.22)' },
        ticks: {
          font: { size: 11 },
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
      y: {
        stacked: true,
        grid: { display: false },
        ticks: {
          font: { size: 12, weight: 600 },
          color: '#334155',
        },
      },
    },
  };
}
