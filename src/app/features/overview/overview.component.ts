import { CurrencyPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';

@Component({
  selector: 'app-overview',
  imports: [CurrencyPipe, PercentPipe, LucideAngularModule],
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

  /** Partes do gráfico de barras empilhado (0–1) */
  readonly barParts = computed(() => {
    const t = this.totals();
    const inc = t.totalIncome;
    const ess = t.totalEssential;
    const ne = t.totalNonEssential;
    const max = Math.max(inc, ess + ne, 1);
    return {
      incomePct: inc / max,
      essentialPct: ess / max,
      nonEssentialPct: ne / max,
      expenseShareEssential: t.totalExpenses > 0 ? ess / t.totalExpenses : 0,
      expenseShareNonEssential: t.totalExpenses > 0 ? ne / t.totalExpenses : 0,
    };
  });
}
