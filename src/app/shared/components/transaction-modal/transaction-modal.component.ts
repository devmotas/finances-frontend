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
import { MonthContextService } from '../../../core/services/month-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { formatNumberToBrlInput, parseBrlToNumber } from '../../../core/utils/brl-parse';
import { httpErrorMessage } from '../../../core/utils/http-error.util';

function defaultDateForSelectedMonth(sel: { year: number; month: number }): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const day = now.getDate();
  if (sel.year === y && sel.month === m) {
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return `${sel.year}-${String(sel.month).padStart(2, '0')}-01`;
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
  private readonly monthCtx = inject(MonthContextService);
  private readonly toast = inject(ToastService);
  private readonly userProfile = inject(UserProfileService);

  readonly visible = input(false);
  readonly flow = input.required<Flow>();
  readonly investmentIntent = input<'aporte' | 'resgate'>('aporte');
  readonly editing = input<Transaction | null>(null);
  readonly closed = output<void>();

  readonly form = this.fb.group({
    categoryId: ['', Validators.required],
    description: ['', Validators.maxLength(500)],
    amount: ['', [Validators.required, amountValidator]],
    date: ['', Validators.required],
    schedule: ['variable' as Schedule, Validators.required],
    recurrenceMonths: [
      12,
      [Validators.required, Validators.min(1), Validators.max(120)],
    ],
    seriesUpdateScope: this.fb.nonNullable.control<'thisMonth' | 'futureSeries'>('thisMonth'),
    markInstallment: [false],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const selYm = this.monthCtx.selectedMonth();
      const e = this.editing();
      const monthsCtrl = this.form.controls.recurrenceMonths;
      const scopeCtrl = this.form.controls.seriesUpdateScope;
      const instCtrl = this.form.controls.markInstallment;
      if (e) {
        instCtrl.disable({ emitEvent: false });
        monthsCtrl.disable({ emitEvent: false });
        if (this.isSeriesTransaction(e)) {
          scopeCtrl.enable({ emitEvent: false });
          scopeCtrl.setValue('thisMonth', { emitEvent: false });
        } else {
          scopeCtrl.disable({ emitEvent: false });
        }
        this.form.patchValue({
          categoryId: String(e.categoryId),
          description: e.description,
          amount: formatNumberToBrlInput(Math.abs(e.amount)),
          date: e.date,
          schedule: e.schedule,
        });
      } else {
        instCtrl.enable({ emitEvent: false });
        monthsCtrl.enable({ emitEvent: false });
        scopeCtrl.disable({ emitEvent: false });
        const months = this.userProfile.defaultRecurrenceMonths();
        this.form.reset({
          categoryId: '',
          description: '',
          amount: '',
          date: defaultDateForSelectedMonth(selYm),
          schedule: 'variable' as Schedule,
          recurrenceMonths: months,
          seriesUpdateScope: 'thisMonth',
          markInstallment: false,
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
    const ed = this.editing();
    const hasEd = !!ed;
    if (f === 'income') return hasEd ? 'Editar entrada' : 'Nova entrada';
    if (f === 'investment') {
      const resgate = ed ? ed.amount < 0 : this.investmentIntent() === 'resgate';
      if (resgate) return hasEd ? 'Editar resgate' : 'Novo resgate';
      return hasEd ? 'Editar aporte' : 'Novo aporte';
    }
    return hasEd ? 'Editar saída' : 'Nova saída';
  }

  amountFieldLabel(): string {
    if (this.flow() === 'investment') {
      const ed = this.editing();
      const resgate = ed ? ed.amount < 0 : this.investmentIntent() === 'resgate';
      return resgate ? 'Valor do resgate (R$)' : 'Valor do aporte (R$)';
    }
    return 'Valor (R$)';
  }

  investmentNewHidesRecurrenceControls(): boolean {
    return !this.editing() && this.flow() === 'investment';
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
    const f = this.flow();
    if (f === 'income') {
      return 'Opcional — ex.: 13º salário, horas extras, nota fiscal 123';
    }
    if (f === 'investment') {
      const ed = this.editing();
      const resgate = ed ? ed.amount < 0 : this.investmentIntent() === 'resgate';
      if (resgate) {
        return 'Opcional — ex.: uso da reserva, transferência para conta corrente';
      }
      return 'Opcional — ex.: compra NTN-B, transferência para corretora';
    }
    return 'Opcional — ex.: compras da semana, mensalidade academia';
  }

  amountPlaceholder(): string {
    return 'Ex.: 1.250,50';
  }

  showRecurrenceMonths(): boolean {
    return (
      !this.editing() &&
      this.flow() !== 'investment' &&
      this.form.controls.schedule.value === 'fixed'
    );
  }

  showSeriesUpdateScope(): boolean {
    const e = this.editing();
    return !!e && this.isSeriesTransaction(e);
  }

  private isSeriesTransaction(t: Transaction): boolean {
    return t.schedule === 'fixed' && t.recurrenceId != null && t.recurrenceId > 0;
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
    const ed = this.editing();
    let amountToSend = amount;
    if (flow === 'investment') {
      if (ed && ed.amount < 0) {
        amountToSend = -Math.abs(amount);
      } else if (!ed && this.investmentIntent() === 'resgate') {
        amountToSend = -Math.abs(amount);
      } else {
        amountToSend = Math.abs(amount);
      }
    }
    const categoryId = Number(v.categoryId);
    if (!Number.isFinite(categoryId)) {
      this.toast.show('Categoria inválida.', 'error');
      return;
    }
    const cat = this.facade.getCategory(categoryId);
    if (!cat || cat.flow !== flow) {
      this.toast.show('Categoria inválida.', 'error');
      return;
    }

    let schedule = v.schedule as Schedule;
    if (flow === 'investment' && !ed) {
      schedule = 'variable';
    }
    const description = (v.description ?? '').trim() || null;

    if (ed) {
      if (!confirm('Deseja salvar as alterações?')) {
        return;
      }
      const applyToFutureSeries =
        this.isSeriesTransaction(ed) &&
        (v.seriesUpdateScope as 'thisMonth' | 'futureSeries') === 'futureSeries';
      this.facade
        .updateTransaction(
          {
            ...ed,
            categoryId,
            description: description ?? '',
            amount: amountToSend,
            date: v.date!,
            schedule,
            flow,
          },
          { applyToFutureSeries }
        )
        .subscribe({
          next: () => {
            const ok =
              flow === 'investment' && amountToSend < 0
                ? 'Resgate atualizado.'
                : flow === 'investment' && amountToSend > 0
                  ? 'Aporte atualizado.'
                  : 'Lançamento atualizado.';
            this.toast.show(ok, 'success');
            this.close();
          },
          error: (err: unknown) => {
            this.toast.show(httpErrorMessage(err, 'Não foi possível atualizar.'), 'error');
          },
        });
      return;
    }

    if (schedule === 'fixed') {
      const months = Math.round(Number(v.recurrenceMonths));
      if (!Number.isFinite(months) || months < 1 || months > 120) {
        this.toast.show('Informe quantos meses repetir (entre 1 e 120).', 'error');
        return;
      }
      const markInstallment = flow === 'expense' && v.markInstallment === true;
      const installmentTotal = markInstallment ? months : undefined;
      this.facade
        .createRecurrence({
          categoryId,
          description,
          amount,
          startDate: v.date!,
          months,
          installmentTotal: installmentTotal ?? undefined,
        })
        .subscribe({
          next: () => {
            this.toast.show('Série fixa criada com sucesso.', 'success');
            this.close();
          },
          error: (err: unknown) => {
            this.toast.show(httpErrorMessage(err, 'Não foi possível salvar a série.'), 'error');
          },
        });
      return;
    }

    const dto = {
      categoryId,
      description,
      amount: amountToSend,
      date: v.date!,
      schedule,
    };

    this.facade.addTransaction(dto).subscribe({
      next: () => {
        const ok =
          flow === 'investment' && amountToSend < 0
            ? 'Resgate registrado.'
            : flow === 'investment' && amountToSend > 0
              ? 'Aporte registrado.'
              : 'Lançamento salvo.';
        this.toast.show(ok, 'success');
        this.close();
      },
      error: (err: unknown) => {
        this.toast.show(httpErrorMessage(err, 'Não foi possível salvar.'), 'error');
      },
    });
  }
}
