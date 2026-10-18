import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  ACCOUNT_ROLE,
  AccountRole,
  InvestmentAccountRecord,
  InvestmentAccountSaveDto,
} from '../../../core/models/investment-accounts.models';
import { VALIDATION_LIMITS } from '../../../core/models/validation-limits';
import { InvestmentAccountsApiService } from '../../../core/services/investment-accounts-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatNumberToBrlInput } from '../../../core/utils/brl-parse';
import { saveErrorMessage } from '../../../core/utils/http-error.util';
import { trackBusy } from '../../../core/utils/track-busy';
import { describedBy, isInvalid } from '../../../shared/a11y/field-a11y';
import { lockBodyScrollWhile } from '../../../shared/a11y/body-scroll-lock';
import { BusyButtonComponent } from '../../../shared/components/busy-button/busy-button.component';
import { BUSY_LABEL } from '../../../shared/components/busy-button/busy-labels';
import {
  amountValidator,
  parseAmount,
  todayIso,
} from '../../../shared/components/investments/investment-form';
import { ACCOUNT_ROLE_HINT, ACCOUNT_ROLE_LABEL, ACCOUNT_ROLES, isShortTermReserve } from '../account-role';

const ESCAPE_KEY = 'Escape';
const BACKDROP_CLASS = 'modal__backdrop';
const ZERO_AMOUNT = 0;

const FEEDBACK = {
  created: 'Conta criada.',
  updated: 'Conta atualizada.',
  createFailed: 'Não foi possível criar a conta.',
  updateFailed: 'Não foi possível atualizar a conta.',
} as const;

@Component({
  selector: 'app-account-modal',
  imports: [ReactiveFormsModule, LucideAngularModule, BusyButtonComponent, CdkTrapFocus],
  templateUrl: './account-modal.component.html',
  styleUrl: './account-modal.component.scss',
})
export class AccountModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InvestmentAccountsApiService);
  private readonly toast = inject(ToastService);

  readonly visible = input(false);
  readonly editing = input<InvestmentAccountRecord | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly limits = VALIDATION_LIMITS;
  readonly roles = ACCOUNT_ROLES;
  readonly roleLabel = ACCOUNT_ROLE_LABEL;
  readonly savingLabel = BUSY_LABEL.saving;
  readonly describedBy = describedBy;
  readonly isInvalid = isInvalid;
  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(VALIDATION_LIMITS.categoryNameMax)]],
    role: this.fb.nonNullable.control<AccountRole>(ACCOUNT_ROLE.investment),
    initialBalance: ['', [amountValidator({ allowZero: true })]],
    initialBalanceDate: ['', Validators.required],
    targetBalance: ['', [amountValidator({ allowZero: false })]],
  });

  private readonly role = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });

  readonly hasTarget = computed(() => isShortTermReserve(this.role()));
  readonly roleHint = computed(() => ACCOUNT_ROLE_HINT[this.role()]);
  readonly title = computed(() => (this.editing() ? 'Editar conta' : 'Nova conta de investimento'));

  constructor() {
    lockBodyScrollWhile(this.visible);
    effect(() => {
      if (this.visible()) this.resetForm(this.editing());
    });
    effect(() => this.toggleTargetControl(this.hasTarget()));
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === ESCAPE_KEY && this.visible()) this.close();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains(BACKDROP_CLASS)) this.close();
  }

  close(): void {
    this.closed.emit();
  }

  save(): void {
    if (this.isSaving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const editing = this.editing();
    this.request(this.toDto(), editing)
      .pipe(trackBusy(this.isSaving))
      .subscribe({
        next: () => this.finish(editing ? FEEDBACK.updated : FEEDBACK.created),
        error: (err: unknown) =>
          this.toast.show(
            saveErrorMessage(err, editing ? FEEDBACK.updateFailed : FEEDBACK.createFailed),
            'error'
          ),
      });
  }

  private request(
    dto: InvestmentAccountSaveDto,
    editing: InvestmentAccountRecord | null
  ): Observable<InvestmentAccountRecord> {
    return editing ? this.api.update(editing.id, dto) : this.api.create(dto);
  }

  private toDto(): InvestmentAccountSaveDto {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      role: value.role,
      initialBalance: parseAmount(value.initialBalance) ?? ZERO_AMOUNT,
      initialBalanceDate: value.initialBalanceDate,
      targetBalance: this.hasTarget() ? parseAmount(value.targetBalance) : null,
    };
  }

  private finish(message: string): void {
    this.toast.show(message, 'success');
    this.saved.emit();
  }

  private resetForm(account: InvestmentAccountRecord | null): void {
    this.form.reset({
      name: account?.name ?? '',
      role: account?.role ?? ACCOUNT_ROLE.investment,
      initialBalance: formatNumberToBrlInput(account?.initialBalance ?? ZERO_AMOUNT),
      initialBalanceDate: account?.initialBalanceDate ?? todayIso(),
      targetBalance: account?.targetBalance != null ? formatNumberToBrlInput(account.targetBalance) : '',
    });
  }

  private toggleTargetControl(enabled: boolean): void {
    const control = this.form.controls.targetBalance;
    if (enabled) control.enable({ emitEvent: false });
    else control.disable({ emitEvent: false });
  }
}
