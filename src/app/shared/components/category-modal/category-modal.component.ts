import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, HostListener, effect, inject, input, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Category, ExpenseGroup, Flow } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { httpErrorMessage } from '../../../core/utils/http-error.util';
import { VALIDATION_LIMITS } from '../../../core/models/validation-limits';
import { trackBusy } from '../../../core/utils/track-busy';
import { BusyButtonComponent } from '../busy-button/busy-button.component';
import { BUSY_LABEL } from '../busy-button/busy-labels';
import { lockBodyScrollWhile } from '../../a11y/body-scroll-lock';
import { describedBy, isInvalid } from '../../a11y/field-a11y';

const CATEGORY_FEEDBACK = {
  created: 'Categoria criada.',
  updated: 'Categoria atualizada.',
  deleted: 'Categoria excluída.',
  createFailed: 'Não foi possível criar a categoria.',
  updateFailed: 'Não foi possível atualizar a categoria.',
  deleteFailed: 'Não foi possível excluir a categoria.',
} as const;

const MODAL_SELECTOR = '.modal';
const NAME_INPUT_SELECTOR = '#cat-name';

@Component({
  selector: 'app-category-modal',
  imports: [ReactiveFormsModule, LucideAngularModule, CurrencyPipe, BusyButtonComponent, CdkTrapFocus],
  templateUrl: './category-modal.component.html',
  styleUrl: './category-modal.component.scss',
})
export class CategoryModalComponent {
  private readonly fb = inject(FormBuilder);
  readonly limits = VALIDATION_LIMITS;
  private readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);

  readonly visible = input(false);
  readonly flow = input.required<Flow>();
  readonly closed = output<void>();

  editingId: number | null = null;
  readonly busyLabel = BUSY_LABEL;
  readonly isSaving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly describedBy = describedBy;
  readonly isInvalid = isInvalid;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(VALIDATION_LIMITS.categoryNameMax)]],
    expenseGroup: ['essential' as ExpenseGroup],
    openingBalanceAmount: this.fb.nonNullable.control(0, [
      Validators.min(-999999999999.99),
      Validators.max(999999999999.99),
    ]),
  });

  constructor() {
    lockBodyScrollWhile(this.visible);
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
    const host = this.el.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>(MODAL_SELECTOR)?.scrollTo({ top: 0, behavior: 'smooth' });
    host.querySelector<HTMLInputElement>(NAME_INPUT_SELECTOR)?.focus({ preventScroll: true });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', expenseGroup: 'essential', openingBalanceAmount: 0 });
  }

  save(): void {
    if (this.isSaving()) return;
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
        .pipe(trackBusy(this.isSaving))
        .subscribe({
          next: () => this.finishSave(CATEGORY_FEEDBACK.updated),
          error: (err: unknown) => this.showError(err, CATEGORY_FEEDBACK.updateFailed),
        });
    } else {
      this.facade
        .addCategory({
          name,
          flow,
          expenseGroup: flow === 'expense' ? group : undefined,
          openingBalanceAmount,
        })
        .pipe(trackBusy(this.isSaving))
        .subscribe({
          next: () => this.finishSave(CATEGORY_FEEDBACK.created),
          error: (err: unknown) => this.showError(err, CATEGORY_FEEDBACK.createFailed),
        });
    }
  }

  remove(c: Category): void {
    if (this.deletingId() !== null) return;
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    this.deletingId.set(c.id);
    this.facade
      .deleteCategory(c.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          if (this.editingId === c.id) this.cancelEdit();
          this.toast.show(CATEGORY_FEEDBACK.deleted, 'success');
        },
        error: (err: unknown) => this.showError(err, CATEGORY_FEEDBACK.deleteFailed),
      });
  }

  private finishSave(message: string): void {
    this.toast.show(message, 'success');
    this.cancelEdit();
  }

  private showError(err: unknown, fallback: string): void {
    this.toast.show(httpErrorMessage(err, fallback), 'error');
  }
}
