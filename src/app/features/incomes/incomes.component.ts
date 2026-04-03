import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Transaction } from '../../core/models/finances.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { ToastService } from '../../core/services/toast.service';
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

  readonly categoryOpen = signal(false);
  readonly txOpen = signal(false);
  readonly editingTx = signal<Transaction | null>(null);
  readonly filterCategoryId = signal<string | null>(null);

  readonly list = computed(() => {
    const fid = this.filterCategoryId();
    const items = this.facade.monthTransactions().filter((t) => t.flow === 'income');
    if (!fid) return items;
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

  removeTx(t: Transaction): void {
    if (!confirm('Excluir esta entrada?')) return;
    this.facade.deleteTransaction(t.id);
    this.toast.show('Entrada excluída.', 'success');
  }

  selectAllFilter(): void {
    this.filterCategoryId.set(null);
  }

  toggleCategoryFilter(id: string): void {
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
