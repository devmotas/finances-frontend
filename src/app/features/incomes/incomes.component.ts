import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Transaction } from '../../core/models/finances.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { ReportsApiService } from '../../core/services/reports-api.service';
import { ToastService } from '../../core/services/toast.service';
import { isSeriesTransaction } from '../../core/utils/transaction-series';
import { CategoryModalComponent } from '../../shared/components/category-modal/category-modal.component';
import { SeriesDeleteModalComponent } from '../../shared/components/series-delete-modal/series-delete-modal.component';
import { TransactionDeletion } from '../../shared/components/series-delete-modal/transaction-deletion';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';
import { MonthLoadErrorComponent } from '../../shared/components/month-load-error/month-load-error.component';
import { BusyButtonComponent } from '../../shared/components/busy-button/busy-button.component';
import { BUSY_LABEL } from '../../shared/components/busy-button/busy-labels';
import { ReportExport } from '../../shared/report-export/report-export';
import { MonthLoadingComponent } from '../../shared/components/month-loading/month-loading.component';
import { ExportMenuDisclosureDirective } from '../../shared/report-export/export-menu-disclosure.directive';
import { TransactionActionLabelPipe } from '../../shared/pipes/transaction-action-label.pipe';

@Component({
  selector: 'app-incomes',
  imports: [
    CurrencyPipe,
    LucideAngularModule,
    CategoryModalComponent,
    TransactionModalComponent,
    SeriesDeleteModalComponent,
    MonthLoadErrorComponent,
    MonthLoadingComponent,
    BusyButtonComponent,
    ExportMenuDisclosureDirective,
    TransactionActionLabelPipe,
  ],
  templateUrl: './incomes.component.html',
  styleUrl: './incomes.component.scss',
})
export class IncomesComponent {
  readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  readonly deletion = new TransactionDeletion(this.facade, this.toast, {
    itemLabel: () => 'esta entrada',
    deletedMessage: () => 'Entrada excluída.',
  });
  readonly reportExport = new ReportExport(
    inject(ReportsApiService),
    inject(MonthContextService),
    this.toast
  );
  readonly busyLabel = BUSY_LABEL;

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
    return isSeriesTransaction(t);
  }

  selectAllFilter(): void {
    this.filterCategoryId.set(null);
  }

  toggleCategoryFilter(id: number): void {
    this.filterCategoryId.update((cur) => (cur === id ? null : id));
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
