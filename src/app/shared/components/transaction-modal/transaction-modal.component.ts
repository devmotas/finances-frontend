import {
  Component,
  HostListener,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Flow, Schedule, Transaction } from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatNumberToBrlInput, parseBrlToNumber } from '../../../core/utils/brl-parse';
import { newId } from '../../../core/utils/id.util';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function amountValidator(control: AbstractControl): ValidationErrors | null {
  const n = parseBrlToNumber(String(control.value ?? ''));
  if (n === null || n <= 0) return { amount: true };
  return null;
}

@Component({
  selector: 'app-transaction-modal',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './transaction-modal.component.html',
  styleUrl: './transaction-modal.component.scss',
})
export class TransactionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);

  readonly visible = input(false);
  readonly flow = input.required<Flow>();
  readonly editing = input<Transaction | null>(null);
  readonly closed = output<void>();

  readonly form = this.fb.group({
    categoryId: ['', Validators.required],
    description: ['', Validators.maxLength(500)],
    amount: ['', [Validators.required, amountValidator]],
    date: ['', Validators.required],
    schedule: ['variable' as Schedule, Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const e = this.editing();
      if (e) {
        this.form.patchValue({
          categoryId: e.categoryId,
          description: e.description,
          amount: formatNumberToBrlInput(e.amount),
          date: e.date,
          schedule: e.schedule,
        });
      } else {
        this.form.reset({
          categoryId: '',
          description: '',
          amount: '',
          date: todayISO(),
          schedule: 'variable' as Schedule,
        });
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.visible()) this.close();
  }

  categories() {
    return this.facade.categoriesByFlow(this.flow());
  }

  title(): string {
    const f = this.flow();
    const ed = !!this.editing();
    if (f === 'income') return ed ? 'Editar entrada' : 'Nova entrada';
    return ed ? 'Editar saída' : 'Nova saída';
  }

  close(): void {
    this.closed.emit();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.close();
    }
  }

  blockNewWithoutCategories(): boolean {
    return !this.editing() && this.categories().length === 0;
  }

  categorySelectPlaceholder(): string {
    return 'Escolha uma categoria';
  }

  descriptionPlaceholder(): string {
    return this.flow() === 'income'
      ? 'Opcional — ex.: 13º salário, horas extras, nota fiscal 123'
      : 'Opcional — ex.: compras da semana, mensalidade academia';
  }

  amountPlaceholder(): string {
    return 'Ex.: 1.250,50';
  }

  save(): void {
    if (this.blockNewWithoutCategories()) {
      this.toast.show('Crie uma categoria antes de salvar o lançamento.', 'error');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Verifique os campos do formulário.', 'error');
      return;
    }
    const v = this.form.getRawValue();
    const amount = parseBrlToNumber(String(v.amount ?? ''));
    if (amount === null || amount <= 0) {
      this.toast.show('Valor inválido.', 'error');
      return;
    }
    const flow = this.flow();
    const cat = this.facade.getCategory(v.categoryId ?? '');
    if (!cat || cat.flow !== flow) {
      this.toast.show('Categoria inválida.', 'error');
      return;
    }

    const base = {
      categoryId: v.categoryId!,
      description: (v.description ?? '').trim(),
      amount,
      date: v.date!,
      schedule: v.schedule as Schedule,
      flow,
    };

    const ed = this.editing();
    if (ed) {
      this.facade.updateTransaction({ ...ed, ...base });
      this.toast.show('Lançamento atualizado.', 'success');
    } else {
      const t: Transaction = { id: newId(), ...base };
      this.facade.addTransaction(t);
      this.toast.show('Lançamento salvo.', 'success');
    }
    this.close();
  }
}
