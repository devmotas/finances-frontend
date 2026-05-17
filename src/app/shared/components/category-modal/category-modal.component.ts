import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, HostListener, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Category, ExpenseGroup, Flow } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { httpErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-category-modal',
  imports: [ReactiveFormsModule, LucideAngularModule, CurrencyPipe],
  templateUrl: './category-modal.component.html',
  styleUrl: './category-modal.component.scss',
})
export class CategoryModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);

  readonly visible = input(false);
  readonly flow = input.required<Flow>();
  readonly closed = output<void>();

  editingId: number | null = null;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    expenseGroup: ['essential' as ExpenseGroup],
    openingBalanceAmount: this.fb.nonNullable.control(0, [
      Validators.min(-999999999999.99),
      Validators.max(999999999999.99),
    ]),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.editingId = null;
        this.form.reset({
          name: '',
          expenseGroup: 'essential',
          openingBalanceAmount: 0,
        });
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.visible()) this.close();
  }

  list(): Category[] {
    return this.facade.categoriesByFlow(this.flow());
  }

  isExpense(): boolean {
    return this.flow() === 'expense';
  }

  isInvestment(): boolean {
    return this.flow() === 'investment';
  }

  namePlaceholder(): string {
    if (this.flow() === 'expense') {
      return 'Ex.: Moradia, alimentação, transporte';
    }
    if (this.flow() === 'investment') {
      return 'Ex.: Tesouro Direto, corretora XYZ, reserva em FIIs';
    }
    return 'Ex.: Salário, freelances, rendimentos';
  }

  close(): void {
    this.editingId = null;
    this.closed.emit();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.close();
    }
  }

  startEdit(c: Category): void {
    this.editingId = c.id;
    this.form.patchValue({
      name: c.name,
      expenseGroup: c.expenseGroup ?? 'essential',
      openingBalanceAmount: c.openingBalanceAmount ?? 0,
    });
    (this.el.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.modal')
      ?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', expenseGroup: 'essential', openingBalanceAmount: 0 });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = (this.form.value.name ?? '').trim();
    const flow = this.flow();
    const group = this.isExpense() ? (this.form.value.expenseGroup as ExpenseGroup) : undefined;
    const openingBalanceAmount = this.isInvestment()
      ? this.form.controls.openingBalanceAmount.getRawValue()
      : 0;

    if (this.editingId != null) {
      const existing = this.facade.getCategory(this.editingId);
      if (!existing) return;
      this.facade
        .updateCategory({
          ...existing,
          name,
          expenseGroup: flow === 'expense' ? group : undefined,
          openingBalanceAmount,
        })
        .subscribe({
          next: () => {
            this.toast.show('Categoria atualizada.', 'success');
            this.cancelEdit();
          },
          error: (err: unknown) => {
            this.toast.show(httpErrorMessage(err, 'Não foi possível atualizar.'), 'error');
          },
        });
    } else {
      this.facade
        .addCategory({
          name,
          flow,
          expenseGroup: flow === 'expense' ? group : undefined,
          openingBalanceAmount,
        })
        .subscribe({
          next: () => {
            this.toast.show('Categoria criada.', 'success');
            this.cancelEdit();
          },
          error: (err: unknown) => {
            this.toast.show(httpErrorMessage(err, 'Não foi possível criar.'), 'error');
          },
        });
    }
  }

  remove(c: Category): void {
    if (!this.facade.canDeleteCategory(c.id)) {
      this.toast.show(
        'Não é possível excluir: existem lançamentos usando esta categoria neste mês (ou o servidor pode bloquear se houver em outros meses).',
        'error'
      );
      return;
    }
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    this.facade.deleteCategory(c.id).subscribe({
      next: () => {
        if (this.editingId === c.id) this.cancelEdit();
        this.toast.show('Categoria excluída.', 'success');
      },
      error: (err: unknown) => {
        this.toast.show(httpErrorMessage(err, 'Não foi possível excluir.'), 'error');
      },
    });
  }
}
