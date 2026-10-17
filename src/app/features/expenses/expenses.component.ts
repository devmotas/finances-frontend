import { CurrencyPipe } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Category, Transaction } from '../../core/models/finances.models';
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

@Component({
  selector: 'app-expenses',
  imports: [
    CurrencyPipe,
    LucideAngularModule,
    CategoryModalComponent,
    TransactionModalComponent,
    SeriesDeleteModalComponent,
    MonthLoadErrorComponent,
    MonthLoadingComponent,
    BusyButtonComponent,
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent {
  readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  readonly deletion = new TransactionDeletion(this.facade, this.toast, {
    itemLabel: () => 'esta saída',
    deletedMessage: () => 'Saída excluída.',
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

  readonly essentialList = computed(() => this.filtered('essential'));
  readonly nonEssentialList = computed(() => this.filtered('nonEssential'));

  readonly totalEssential = computed(() =>
    this.essentialList().reduce((s, t) => s + t.amount, 0)
  );
  readonly totalNonEssential = computed(() =>
    this.nonEssentialList().reduce((s, t) => s + t.amount, 0)
  );

  readonly categories = computed(() => this.facade.expenseCategories());

  private filtered(group: 'essential' | 'nonEssential'): Transaction[] {
    const fid = this.filterCategoryId();
    const catIds = new Set(this.facade.expenseCategories(group).map((c) => c.id));
    let items = this.facade
      .monthTransactions()
      .filter((t) => t.flow === 'expense' && catIds.has(t.categoryId));
    if (fid != null) items = items.filter((t) => t.categoryId === fid);
    return items;
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

  @HostListener('document:click')
  closeExportMenu(): void {
    this.reportExport.closeMenu();
  }

  openNewTx(): void {
    if (this.facade.expenseCategories().length === 0) {
      this.toast.show('Crie uma categoria antes de registrar uma saída.', 'info');
      this.categoryOpen.set(true);
      return;
    }
    this.editingTx.set(null);
    this.txOpen.set(true);
  }
}
