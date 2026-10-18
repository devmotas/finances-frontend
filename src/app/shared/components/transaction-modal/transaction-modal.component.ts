import { Component, HostListener, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Observable } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import {
  Flow,
  INVESTMENT_DIRECTION,
  InvestmentDirection,
  Transaction,
} from '../../../core/models/finances.models';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';
import { MonthContextService } from '../../../core/services/month-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatNumberToBrlInput, parseBrlToNumber } from '../../../core/utils/brl-parse';
import { isWithdrawal } from '../../../core/utils/finance-calculations';
import { saveErrorMessage } from '../../../core/utils/http-error.util';
import { isSeriesTransaction } from '../../../core/utils/transaction-series';
import { VALIDATION_LIMITS } from '../../../core/models/validation-limits';
import { trackBusy } from '../../../core/utils/track-busy';
import { BusyButtonComponent } from '../busy-button/busy-button.component';
import { BUSY_LABEL } from '../busy-button/busy-labels';
import { lockBodyScrollWhile } from '../../a11y/body-scroll-lock';
import { describedBy, isInvalid } from '../../a11y/field-a11y';
import {
  InstallmentPlan,
  installmentPreview,
  planFromInstallmentAmount,
  planFromTotal,
} from './installment-plan';
import {
  INSTALLMENTS_MIN,
  RECURRENCE,
  RecurrenceChoice,
  RecurrenceOption,
  recurrenceOptionsFor,
  seriesRequest,
} from './transaction-recurrence';

type EntryKind = 'income' | 'expense' | 'contribution' | 'withdrawal';

const SERIES_UPDATE_SCOPE = {
  thisMonth: 'thisMonth',
  futureSeries: 'futureSeries',
} as const;

type SeriesUpdateScope = (typeof SERIES_UPDATE_SCOPE)[keyof typeof SERIES_UPDATE_SCOPE];

const INVESTMENT_FLOW = 'investment' satisfies Flow;
const WITHDRAWAL_INTENT = 'resgate';
const DEFAULT_INSTALLMENTS = 10;
const FIRST_DAY_OF_MONTH = '01';
const ESCAPE_KEY = 'Escape';
const BACKDROP_CLASS = 'modal__backdrop';

const SAVED_MESSAGE: Record<EntryKind, { created: string; updated: string }> = {
  income: { created: 'Entrada registrada.', updated: 'Entrada atualizada.' },
  expense: { created: 'Saída registrada.', updated: 'Saída atualizada.' },
  contribution: { created: 'Aporte registrado.', updated: 'Aporte atualizado.' },
  withdrawal: { created: 'Resgate registrado.', updated: 'Resgate atualizado.' },
};

type SeriesChoice = Exclude<RecurrenceChoice, typeof RECURRENCE.single>;

const SERIES_FEEDBACK: Record<SeriesChoice, { created: string; failed: string }> = {
  fixed: { created: 'Série fixa criada.', failed: 'Não foi possível criar a série fixa.' },
  installment: {
    created: 'Compra parcelada registrada.',
    failed: 'Não foi possível registrar a compra parcelada.',
  },
};

const TX_FEEDBACK = {
  missingCategory: 'Crie uma categoria antes de salvar o lançamento.',
  invalidForm: 'Verifique os campos do formulário.',
  invalidAmount: 'Valor inválido.',
  invalidCategory: 'Categoria inválida.',
  totalTooSmall: 'O valor total é pequeno demais para o número de parcelas.',
  confirmEdit: 'Deseja salvar as alterações?',
  createFailed: 'Não foi possível salvar o lançamento.',
  updateFailed: 'Não foi possível atualizar o lançamento.',
} as const;

const AMOUNT_LABEL = {
  default: 'Valor (R$)',
  installment: 'Valor da parcela (R$)',
  installmentTotal: 'Valor total da compra (R$)',
  contribution: 'Valor do aporte (R$)',
  withdrawal: 'Valor do resgate (R$)',
} as const;

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function defaultDateForSelectedMonth(sel: { year: number; month: number }): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (sel.year === year && sel.month === month) {
    return `${year}-${padTwo(month)}-${padTwo(now.getDate())}`;
  }
  return `${sel.year}-${padTwo(sel.month)}-${FIRST_DAY_OF_MONTH}`;
}

function amountValidator(control: AbstractControl): ValidationErrors | null {
  const n = parseBrlToNumber(String(control.value ?? ''));
  if (n === null || n <= 0) return { amount: true };
  return null;
}

function directionFromWithdrawal(withdrawal: boolean): InvestmentDirection {
  return withdrawal ? INVESTMENT_DIRECTION.withdrawal : INVESTMENT_DIRECTION.contribution;
}

@Component({
  selector: 'app-transaction-modal',
  imports: [ReactiveFormsModule, LucideAngularModule, BusyButtonComponent, CdkTrapFocus],
  templateUrl: './transaction-modal.component.html',
  styleUrl: './transaction-modal.component.scss',
})
export class TransactionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(FinancesFacadeService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly toast = inject(ToastService);
  readonly limits = VALIDATION_LIMITS;
  readonly installmentsMin = INSTALLMENTS_MIN;
  readonly recurrence = RECURRENCE;
  readonly scope = SERIES_UPDATE_SCOPE;
  readonly savingLabel = BUSY_LABEL.saving;
  readonly isSaving = signal(false);
  readonly describedBy = describedBy;
  readonly isInvalid = isInvalid;

  readonly visible = input(false);
  readonly flow = input.required<Flow>();
  readonly investmentIntent = input<'aporte' | 'resgate'>('aporte');
  readonly editing = input<Transaction | null>(null);
  readonly closed = output<void>();

  readonly form = this.fb.group({
    categoryId: ['', Validators.required],
    description: ['', Validators.maxLength(VALIDATION_LIMITS.descriptionMax)],
    amount: ['', [Validators.required, amountValidator]],
    date: ['', Validators.required],
    recurrence: this.fb.nonNullable.control<RecurrenceChoice>(RECURRENCE.single),
    installments: this.fb.nonNullable.control(DEFAULT_INSTALLMENTS, [
      Validators.required,
      Validators.min(INSTALLMENTS_MIN),
      Validators.max(VALIDATION_LIMITS.monthsMax),
    ]),
    amountIsTotal: this.fb.nonNullable.control(false),
    seriesUpdateScope: this.fb.nonNullable.control<SeriesUpdateScope>(SERIES_UPDATE_SCOPE.thisMonth),
  });

  constructor() {
    lockBodyScrollWhile(this.visible);
    this.form.controls.recurrence.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((choice) => this.syncInstallmentControls(choice));
    effect(() => {
      if (!this.visible()) return;
      const editing = this.editing();
      if (editing) {
        this.resetForEdit(editing);
      } else {
        this.resetForNew();
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === ESCAPE_KEY && this.visible()) this.close();
  }

  private resetForEdit(e: Transaction): void {
    const scopeCtrl = this.form.controls.seriesUpdateScope;
    if (isSeriesTransaction(e)) {
      scopeCtrl.enable({ emitEvent: false });
      scopeCtrl.setValue(SERIES_UPDATE_SCOPE.thisMonth, { emitEvent: false });
    } else {
      scopeCtrl.disable({ emitEvent: false });
    }
    this.form.patchValue(
      {
        categoryId: String(e.categoryId),
        description: e.description,
        amount: formatNumberToBrlInput(Math.abs(e.amount)),
        date: e.date,
        recurrence: RECURRENCE.single,
      },
      { emitEvent: false }
    );
    this.syncInstallmentControls(RECURRENCE.single);
  }

  private resetForNew(): void {
    this.form.controls.seriesUpdateScope.disable({ emitEvent: false });
    this.form.reset(
      {
        categoryId: '',
        description: '',
        amount: '',
        date: defaultDateForSelectedMonth(this.monthCtx.selectedMonth()),
        recurrence: RECURRENCE.single,
        installments: DEFAULT_INSTALLMENTS,
        amountIsTotal: false,
        seriesUpdateScope: SERIES_UPDATE_SCOPE.thisMonth,
      },
      { emitEvent: false }
    );
    this.syncInstallmentControls(RECURRENCE.single);
  }

  private syncInstallmentControls(choice: RecurrenceChoice): void {
    const controls = [this.form.controls.installments, this.form.controls.amountIsTotal];
    for (const control of controls) {
      if (choice === RECURRENCE.installment) control.enable({ emitEvent: false });
      else control.disable({ emitEvent: false });
    }
  }

  categories() {
    return this.facade.categoriesByFlow(this.flow());
  }

  recurrenceOptions(): readonly RecurrenceOption[] {
    return recurrenceOptionsFor(this.flow());
  }

  selectedRecurrenceHint(): string {
    const choice = this.form.controls.recurrence.value;
    return this.recurrenceOptions().find((o) => o.value === choice)?.hint ?? '';
  }

  private isInvestment(): boolean {
    return this.flow() === INVESTMENT_FLOW;
  }

  private isWithdrawalEntry(): boolean {
    const ed = this.editing();
    return ed ? isWithdrawal(ed) : this.investmentIntent() === WITHDRAWAL_INTENT;
  }

  title(): string {
    const f = this.flow();
    const hasEd = !!this.editing();
    if (f === 'income') return hasEd ? 'Editar entrada' : 'Nova entrada';
    if (f === INVESTMENT_FLOW) {
      if (this.isWithdrawalEntry()) return hasEd ? 'Editar resgate' : 'Novo resgate';
      return hasEd ? 'Editar aporte' : 'Novo aporte';
    }
    return hasEd ? 'Editar saída' : 'Nova saída';
  }

  amountFieldLabel(): string {
    if (this.isInvestment()) {
      return this.isWithdrawalEntry() ? AMOUNT_LABEL.withdrawal : AMOUNT_LABEL.contribution;
    }
    if (!this.isInstallmentSelected()) return AMOUNT_LABEL.default;
    return this.form.controls.amountIsTotal.value ? AMOUNT_LABEL.installmentTotal : AMOUNT_LABEL.installment;
  }

  showsWithdrawalHint(): boolean {
    return this.isInvestment() && !this.editing() && this.investmentIntent() === WITHDRAWAL_INTENT;
  }

  investmentNewHidesRecurrenceControls(): boolean {
    return !this.editing() && this.isInvestment();
  }

  showRecurrenceChoice(): boolean {
    return !this.editing() && !this.isInvestment();
  }

  isInstallmentSelected(): boolean {
    return this.showRecurrenceChoice() && this.form.controls.recurrence.value === RECURRENCE.installment;
  }

  installmentPreviewText(): string | null {
    const plan = this.currentInstallmentPlan();
    return plan ? installmentPreview(plan) : null;
  }

  private currentInstallmentPlan(): InstallmentPlan | null {
    if (!this.isInstallmentSelected() || this.form.controls.installments.invalid) return null;
    const amount = parseBrlToNumber(String(this.form.controls.amount.value ?? ''));
    if (amount === null || amount <= 0) return null;
    const count = this.form.controls.installments.value;
    return this.form.controls.amountIsTotal.value
      ? planFromTotal(amount, count)
      : planFromInstallmentAmount(amount, count);
  }

  close(): void {
    this.closed.emit();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains(BACKDROP_CLASS)) {
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
    if (f === INVESTMENT_FLOW) {
      if (this.isWithdrawalEntry()) {
        return 'Opcional — ex.: uso da reserva, transferência para conta corrente';
      }
      return 'Opcional — ex.: compra NTN-B, transferência para corretora';
    }
    return 'Opcional — ex.: compras da semana, mensalidade academia';
  }

  amountPlaceholder(): string {
    return 'Ex.: 1.250,50';
  }

  showSeriesUpdateScope(): boolean {
    const e = this.editing();
    return !!e && isSeriesTransaction(e);
  }

  save(): void {
    if (this.isSaving()) return;
    if (this.blockNewWithoutCategories()) {
      this.toast.show(TX_FEEDBACK.missingCategory, 'error');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show(TX_FEEDBACK.invalidForm, 'error');
      return;
    }
    const amount = parseBrlToNumber(String(this.form.controls.amount.value ?? ''));
    if (amount === null || amount <= 0) {
      this.toast.show(TX_FEEDBACK.invalidAmount, 'error');
      return;
    }
    const categoryId = Number(this.form.controls.categoryId.value);
    const cat = Number.isFinite(categoryId) ? this.facade.getCategory(categoryId) : undefined;
    if (!cat || cat.flow !== this.flow()) {
      this.toast.show(TX_FEEDBACK.invalidCategory, 'error');
      return;
    }

    const ed = this.editing();
    if (ed) {
      this.saveEdit(ed, categoryId, amount);
    } else if (this.showRecurrenceChoice() && this.form.controls.recurrence.value !== RECURRENCE.single) {
      this.saveSeries(categoryId, amount);
    } else {
      this.saveSingle(categoryId, amount);
    }
  }

  private description(): string | null {
    return (this.form.controls.description.value ?? '').trim() || null;
  }

  private date(): string {
    return this.form.controls.date.value ?? '';
  }

  private investmentDirection(): InvestmentDirection | undefined {
    return this.isInvestment() ? directionFromWithdrawal(this.isWithdrawalEntry()) : undefined;
  }

  private savedMessage(): { created: string; updated: string } {
    const flow = this.flow();
    if (flow !== INVESTMENT_FLOW) return SAVED_MESSAGE[flow];
    return SAVED_MESSAGE[this.isWithdrawalEntry() ? 'withdrawal' : 'contribution'];
  }

  private saveEdit(ed: Transaction, categoryId: number, amount: number): void {
    if (!confirm(TX_FEEDBACK.confirmEdit)) return;
    const applyToFutureSeries =
      isSeriesTransaction(ed) &&
      this.form.controls.seriesUpdateScope.value === SERIES_UPDATE_SCOPE.futureSeries;
    const updated: Transaction = {
      ...ed,
      categoryId,
      description: this.description() ?? '',
      amount,
      date: this.date(),
      direction: this.investmentDirection() ?? ed.direction,
    };
    this.submit(
      this.facade.updateTransaction(updated, { applyToFutureSeries }),
      this.savedMessage().updated,
      TX_FEEDBACK.updateFailed
    );
  }

  private saveSeries(categoryId: number, amount: number): void {
    const choice = this.form.controls.recurrence.value;
    const request = seriesRequest({
      choice,
      categoryId,
      description: this.description(),
      startDate: this.date(),
      amount,
      installments: this.form.controls.installments.value,
      amountIsTotal: this.form.controls.amountIsTotal.value,
    });
    if (!request || choice === RECURRENCE.single) return;
    if (choice === RECURRENCE.installment && !this.currentInstallmentPlan()) {
      this.toast.show(TX_FEEDBACK.totalTooSmall, 'error');
      return;
    }
    const feedback = SERIES_FEEDBACK[choice];
    this.submit(this.facade.createRecurrence(request), feedback.created, feedback.failed);
  }

  private saveSingle(categoryId: number, amount: number): void {
    this.submit(
      this.facade.addTransaction({
        categoryId,
        direction: this.investmentDirection(),
        description: this.description(),
        amount,
        date: this.date(),
      }),
      this.savedMessage().created,
      TX_FEEDBACK.createFailed
    );
  }

  private submit(request$: Observable<unknown>, successMessage: string, failureMessage: string): void {
    request$.pipe(trackBusy(this.isSaving)).subscribe({
      next: () => this.finishWithSuccess(successMessage),
      error: (err: unknown) => this.showError(err, failureMessage),
    });
  }

  private finishWithSuccess(message: string): void {
    this.toast.show(message, 'success');
    this.close();
  }

  private showError(err: unknown, fallback: string): void {
    this.toast.show(saveErrorMessage(err, fallback), 'error');
  }
}
