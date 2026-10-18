import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CurrencyPipe } from '@angular/common';
import { Component, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BalanceUpdateDto, InvestmentMonthAccount } from '../../../core/models/investment-accounts.models';
import { InvestmentAccountsApiService } from '../../../core/services/investment-accounts-api.service';
import { MonthContextService } from '../../../core/services/month-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { formatBrl } from '../../../core/utils/brl-format';
import { saveErrorMessage } from '../../../core/utils/http-error.util';
import { trackBusy } from '../../../core/utils/track-busy';
import { describedBy, isInvalid } from '../../../shared/a11y/field-a11y';
import { lockBodyScrollWhile } from '../../../shared/a11y/body-scroll-lock';
import { BusyButtonComponent } from '../../../shared/components/busy-button/busy-button.component';
import { BUSY_LABEL } from '../../../shared/components/busy-button/busy-labels';
import {
  amountValidator,
  defaultBalanceUpdateDate,
  parseAmount,
} from '../../../shared/components/investments/investment-form';

const ESCAPE_KEY = 'Escape';
const BACKDROP_CLASS = 'modal__backdrop';
const ZERO_AMOUNT = 0;
const SAVE_FAILED = 'Não foi possível atualizar o saldo.';

export function balanceUpdatedMessage(update: BalanceUpdateDto): string {
  return `Saldo atualizado. Rendimento até essa data: ${formatBrl(update.yield)}.`;
}

@Component({
  selector: 'app-balance-update-modal',
  imports: [ReactiveFormsModule, LucideAngularModule, BusyButtonComponent, CdkTrapFocus, CurrencyPipe],
  templateUrl: './balance-update-modal.component.html',
  styleUrl: './balance-update-modal.component.scss',
})
export class BalanceUpdateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InvestmentAccountsApiService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly toast = inject(ToastService);

  readonly account = input<InvestmentMonthAccount | null>(null);
  readonly closed = output<void>();
  readonly saved = output<BalanceUpdateDto>();

  readonly visible = computed(() => this.account() !== null);
  readonly savingLabel = BUSY_LABEL.saving;
  readonly describedBy = describedBy;
  readonly isInvalid = isInvalid;
  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    date: ['', Validators.required],
    balance: ['', [Validators.required, amountValidator({ allowZero: true })]],
  });

  constructor() {
    lockBodyScrollWhile(this.visible);
    effect(() => {
      if (this.visible()) {
        this.form.reset({ date: defaultBalanceUpdateDate(this.monthCtx.selectedMonth()), balance: '' });
      }
    });
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
    const account = this.account();
    if (!account || this.isSaving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.api
      .addBalanceUpdate(account.id, { date: value.date, balance: parseAmount(value.balance) ?? ZERO_AMOUNT })
      .pipe(trackBusy(this.isSaving))
      .subscribe({
        next: (update) => {
          this.toast.show(balanceUpdatedMessage(update), 'success');
          this.saved.emit(update);
        },
        error: (err: unknown) => this.toast.show(saveErrorMessage(err, SAVE_FAILED), 'error'),
      });
  }
}
