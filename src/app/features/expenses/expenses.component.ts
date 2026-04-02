import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Transaction } from '../../core/models/finances.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoryModalComponent } from '../../shared/components/category-modal/category-modal.component';
import { TransactionModalComponent } from '../../shared/components/transaction-modal/transaction-modal.component';

@Component({
  selector: 'app-expenses',
  imports: [CurrencyPipe, LucideAngularModule, CategoryModalComponent, TransactionModalComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent {
  readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);

  readonly categoryOpen = signal(false);
  readonly txOpen = signal(false);
  readonly editingTx = signal<Transaction | null>(null);
  readonly filterCategoryId = signal<string | null>(null);

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
    const catIds = new Set(
      this.facade.expenseCategories(group).map((c) => c.id)
    );
    let items = this.facade
      .monthTransactions()
      .filter((t) => t.flow === 'expense' && catIds.has(t.categoryId));
    if (fid) items = items.filter((t) => t.categoryId === fid);
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

  removeTx(t: Transaction): void {
    if (!confirm('Excluir esta saída?')) return;
    this.facade.deleteTransaction(t.id);
    this.toast.show('Saída excluída.', 'success');
  }

  selectAllFilter(): void {
    this.filterCategoryId.set(null);
  }

  toggleCategoryFilter(id: string): void {
    this.filterCategoryId.update((cur) => (cur === id ? null : id));
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
