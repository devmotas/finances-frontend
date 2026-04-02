import { Component, HostListener, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, ExpenseGroup, Flow } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { newId } from '../../../core/utils/id.util';

@Component({
  selector: 'app-category-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './category-modal.component.html',
  styleUrl: './category-modal.component.scss',
})
export class CategoryModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);

  readonly visible = input(false);
  readonly flow = input.required<Flow>();
  readonly closed = output<void>();

  editingId: string | null = null;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    expenseGroup: ['essential' as ExpenseGroup],
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.editingId = null;
        this.form.reset({
          name: '',
          expenseGroup: 'essential',
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
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', expenseGroup: 'essential' });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = (this.form.value.name ?? '').trim();
    const flow = this.flow();
    const group = this.isExpense() ? (this.form.value.expenseGroup as ExpenseGroup) : undefined;

    if (this.editingId) {
      const existing = this.facade.getCategory(this.editingId);
      if (!existing) return;
      this.facade.updateCategory({
        ...existing,
        name,
        expenseGroup: flow === 'expense' ? group : undefined,
      });
      this.toast.show('Categoria atualizada.', 'success');
    } else {
      const cat: Category = {
        id: newId(),
        name,
        flow,
        expenseGroup: flow === 'expense' ? group : undefined,
      };
      this.facade.addCategory(cat);
      this.toast.show('Categoria criada.', 'success');
    }
    this.cancelEdit();
  }

  remove(c: Category): void {
    if (!this.facade.canDeleteCategory(c.id)) {
      this.toast.show(
        'Não é possível excluir: existem lançamentos usando esta categoria.',
        'error'
      );
      return;
    }
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    this.facade.deleteCategory(c.id);
    if (this.editingId === c.id) this.cancelEdit();
    this.toast.show('Categoria excluída.', 'success');
  }

}
