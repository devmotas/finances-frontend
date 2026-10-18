import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LucideAngularModule } from 'lucide-angular';
import {
  InvestmentMonthPoint,
  InvestmentMonthView,
} from '../../../core/models/investment-accounts.models';
import { formatBrl } from '../../../core/utils/brl-format';
import {
  CHART_SEGMENT_BORDER,
  cssToken,
  flowShade,
  formatCompactBrl,
} from '../../../shared/charts/chart-theme';

const STACK_ID = 'accounts';
const LEGEND_BOX_WIDTH = 10;
const LEGEND_FONT_SIZE = 10;
const TICK_FONT_SIZE = 11;
const MAX_TICK_ROTATION = 40;
const BAR_BORDER_WIDTH = 1;
const BAR_BORDER_RADIUS = 2;
const LABEL_MAX_LENGTH = 26;
const LABEL_CUT_LENGTH = 24;
const ELLIPSIS = '…';
const MONTH_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', year: '2-digit' };
const LOCALE = 'pt-BR';

export interface EvolutionTableRow {
  label: string;
  positions: number[];
  total: number;
  yield: number;
}

function pointLabel(point: InvestmentMonthPoint): string {
  const custom = point.displayLabel?.trim();
  if (custom) return custom;
  return new Date(point.year, point.month - 1, 1).toLocaleDateString(LOCALE, MONTH_LABEL_FORMAT);
}

function shortName(name: string): string {
  return name.length > LABEL_MAX_LENGTH ? `${name.slice(0, LABEL_CUT_LENGTH).trimEnd()}${ELLIPSIS}` : name;
}

@Component({
  selector: 'app-investment-evolution-chart',
  imports: [BaseChartDirective, CurrencyPipe, LucideAngularModule],
  templateUrl: './evolution-chart.component.html',
  styleUrl: './evolution-chart.component.scss',
})
export class EvolutionChartComponent {
  readonly view = input.required<InvestmentMonthView>();

  readonly chartType = 'bar' as const;

  readonly accounts = computed(() => this.view().stackAccounts);

  readonly hasData = computed(
    () => this.accounts().length > 0 && this.view().monthlySeries.length > 0
  );

  readonly rows = computed((): EvolutionTableRow[] =>
    this.view().monthlySeries.map((point) => ({
      label: pointLabel(point),
      positions: this.accounts().map((_, index) => point.accountPositions[index] ?? 0),
      total: point.cumulativeWealth,
      yield: point.yield,
    }))
  );

  readonly summary = computed(() => {
    const rows = this.rows();
    const first = rows.at(0);
    const last = rows.at(-1);
    if (!first || !last) return '';
    return (
      `Evolução do patrimônio por conta: passa de ${formatBrl(first.total)} em ${first.label} ` +
      `para ${formatBrl(last.total)} em ${last.label}. Valores em "Ver dados do gráfico".`
    );
  });

  readonly data = computed((): ChartData<'bar'> => {
    const rows = this.rows();
    return {
      labels: rows.map((row) => row.label),
      datasets: this.accounts().map((account, index) => ({
        label: shortName(account.name),
        data: rows.map((row) => row.positions[index]),
        stack: STACK_ID,
        backgroundColor: flowShade('investment', index),
        borderColor: CHART_SEGMENT_BORDER,
        borderWidth: BAR_BORDER_WIDTH,
        borderRadius: BAR_BORDER_RADIUS,
        borderSkipped: false,
      })),
    };
  });

  readonly options = computed((): ChartConfiguration<'bar'>['options'] => {
    const rows = this.rows();
    const muted = cssToken('--fin-text-muted');
    const grid = { color: cssToken('--fin-border') };
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: LEGEND_BOX_WIDTH,
            font: { size: LEGEND_FONT_SIZE },
            color: cssToken('--fin-text-secondary'),
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => `${ctx.dataset.label ?? ''}: ${formatBrl(Number(ctx.raw))}`,
            footer: (items: TooltipItem<'bar'>[]) => {
              const row = rows[items[0]?.dataIndex ?? 0];
              return row ? `Patrimônio: ${formatBrl(row.total)}` : '';
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid,
          ticks: { font: { size: TICK_FONT_SIZE }, color: muted, maxRotation: MAX_TICK_ROTATION, minRotation: 0 },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: 'Patrimônio (R$)', color: muted, font: { size: TICK_FONT_SIZE } },
          grid,
          ticks: { color: muted, callback: (value) => formatCompactBrl(Number(value)) },
        },
      },
    };
  });

  accountShade(index: number): string {
    return flowShade('investment', index);
  }
}
