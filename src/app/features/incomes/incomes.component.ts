import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Transaction } from '../../core/models/finances.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { MonthContextService } from '../../core/services/month-context.service';
import {
  ReportFormat,
  ReportPeriod,
  ReportsApiService,
} from '../../core/services/reports-api.service';
import { ToastService } from '../../core/services/toast.service';
import { httpErrorMessage } from '../../core/utils/http-error.util';
import { CategoryModalComponent } from '../../shared/components/category-modal/category-modal.component';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';

@Component({
  selector: 'app-incomes',
  imports: [CurrencyPipe, LucideAngularModule, CategoryModalComponent, TransactionModalComponent],
  templateUrl: './incomes.component.html',
  styleUrl: './incomes.component.scss',
})
export class IncomesComponent {
  readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly reportsApi = inject(ReportsApiService);

  readonly exportPeriod = signal<ReportPeriod>('month');

  readonly categoryOpen = signal(false);
  readonly txOpen = signal(false);
  readonly editingTx = signal<Transaction | null>(null);
  readonly filterCategoryId = signal<number | null>(null);

  readonly list = computed(() => {
    const fid = this.filterCategoryId();
    const items = this.facade.monthTransactions().filter((t) => t.flow === 'income');
    if (fid == null) return items;
    return items.filter((t) => t.categoryId === fid);
  });

  readonly total = computed(() => this.facade.monthTotals().totalIncome);

  readonly categories = computed(() => this.facade.incomeCategories());

  openCategory(): void {
    this.categoryOpen.set(true);
  }

  closeCategory(): void {
    this.categoryOpen.set(false);
  }

  closeTx(): void {
    this.txOpen.set(false);
    this.editingTx.set(null);
  }

  editTx(t: Transaction): void {
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
        'Esta entrada faz parte de uma série fixa.\n\n' +
          'OK = Excluir este mês e todos os meses seguintes da série\n' +
          'Cancelar = Excluir somente este mês'
      );
    } else if (!confirm('Excluir esta entrada?')) {
      return;
    }
    this.facade.deleteTransaction(t.id, { applyToFutureSeries }).subscribe({
      next: () => this.toast.show('Entrada excluída.', 'success'),
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

  onExportPeriodChange(e: Event): void {
    const v = (e.target as HTMLSelectElement).value as ReportPeriod;
    this.exportPeriod.set(v);
  }

  exportReport(format: ReportFormat): void {
    const { year, month } = this.monthCtx.selectedMonth();
    const period = this.exportPeriod();
    this.reportsApi.download(format, year, period, month).subscribe({
      next: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        a.click();
        URL.revokeObjectURL(url);
        this.toast.show('Download iniciado.', 'success');
      },
      error: (err: unknown) => {
        this.toast.show(httpErrorMessage(err, 'Não foi possível exportar.'), 'error');
      },
    });
  }

  openNewTx(): void {
    if (this.facade.incomeCategories().length === 0) {
      this.toast.show('Crie uma categoria antes de registrar uma entrada.', 'info');
      this.categoryOpen.set(true);
      return;
    }
    this.editingTx.set(null);
    this.txOpen.set(true);
  }
}
