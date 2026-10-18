import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  InvestmentMonthAccount,
  InvestmentMovement,
  InvestmentMovementSaveDto,
  MOVEMENT_DIRECTION,
  MovementDirection,
} from '../../../core/models/investment-accounts.models';
import { VALIDATION_LIMITS } from '../../../core/models/validation-limits';
import { InvestmentMovementsApiService } from '../../../core/services/investment-movements-api.service';
import { MonthContextService } from '../../../core/services/month-context.service';
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
  defaultDateForMonth,
  parseAmount,
} from '../../../shared/components/investments/investment-form';
import { DIRECTIONS, directionActionLabel, isShortTermReserve } from '../account-role';

const ESCAPE_KEY = 'Escape';
const BACKDROP_CLASS = 'modal__backdrop';
const NO_ACCOUNT = '';
const ZERO_AMOUNT = 0;

const FEEDBACK = {
  saved: 'Lançamento salvo.',
  saveFailed: 'Não foi possível salvar o lançamento.',
} as const;

const DIRECTION_HINT = {
  investment: {
    [MOVEMENT_DIRECTION.contribution]: 'Sai do caixa e entra na conta.',
    [MOVEMENT_DIRECTION.withdrawal]: 'Sai da conta e volta para o caixa.',
  },
  shortTerm: {
    [MOVEMENT_DIRECTION.contribution]: 'Volta para a reserva de curto prazo. Não conta como saída.',
    [MOVEMENT_DIRECTION.withdrawal]: 'Vai da reserva de curto prazo para o caixa. Não conta como entrada.',
  },
} as const;

export interface MovementPreset {
  accountId: number | null;
  direction: MovementDirection;
}

@Component({
  selector: 'app-movement-modal',
  imports: [ReactiveFormsModule, LucideAngularModule, BusyButtonComponent, CdkTrapFocus],
  templateUrl: './movement-modal.component.html',
  styleUrl: './movement-modal.component.scss',
})
export class MovementModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InvestmentMovementsApiService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly toast = inject(ToastService);

  readonly visible = input(false);
  readonly accounts = input.required<InvestmentMonthAccount[]>();
  readonly editing = input<InvestmentMovement | null>(null);
  readonly preset = input<MovementPreset>({ accountId: null, direction: MOVEMENT_DIRECTION.contribution });
  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly limits = VALIDATION_LIMITS;
  readonly directions = DIRECTIONS;
  readonly savingLabel = BUSY_LABEL.saving;
  readonly describedBy = describedBy;
  readonly isInvalid = isInvalid;
  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    accountId: [NO_ACCOUNT, Validators.required],
    direction: this.fb.nonNullable.control<MovementDirection>(MOVEMENT_DIRECTION.contribution),
    amount: ['', [Validators.required, amountValidator({ allowZero: false })]],
    date: ['', Validators.required],
    description: ['', Validators.maxLength(VALIDATION_LIMITS.descriptionMax)],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  private readonly selectedRole = computed(() => {
    const id = Number(this.formValue().accountId);
    return this.accounts().find((account) => account.id === id)?.role;
  });

  readonly isShortTerm = computed(() => isShortTermReserve(this.selectedRole()));

  readonly directionHint = computed(() => {
    const direction = this.formValue().direction ?? MOVEMENT_DIRECTION.contribution;
    return (this.isShortTerm() ? DIRECTION_HINT.shortTerm : DIRECTION_HINT.investment)[direction];
  });

  readonly title = computed(() => {
    if (this.editing()) return 'Editar lançamento';
    return this.isShortTerm() ? 'Pegar emprestado ou devolver' : 'Aporte ou resgate';
  });

  constructor() {
    lockBodyScrollWhile(this.visible);
    effect(() => {
      if (this.visible()) this.resetForm();
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === ESCAPE_KEY && this.visible()) this.close();
  }

  directionLabel(direction: MovementDirection): string {
    return directionActionLabel(this.selectedRole(), direction);
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
    this.request(this.toDto())
      .pipe(trackBusy(this.isSaving))
      .subscribe({
        next: () => {
          this.toast.show(FEEDBACK.saved, 'success');
          this.saved.emit();
        },
        error: (err: unknown) => this.toast.show(saveErrorMessage(err, FEEDBACK.saveFailed), 'error'),
      });
  }

  private request(dto: InvestmentMovementSaveDto): Observable<InvestmentMovement> {
    const editing = this.editing();
    return editing ? this.api.update(editing.id, dto) : this.api.create(dto);
  }

  private toDto(): InvestmentMovementSaveDto {
    const value = this.form.getRawValue();
    return {
      investmentAccountId: Number(value.accountId),
      direction: value.direction,
      amount: parseAmount(value.amount) ?? ZERO_AMOUNT,
      date: value.date,
      description: value.description.trim() || null,
    };
  }

  private resetForm(): void {
    const editing = this.editing();
    if (editing) {
      this.form.reset({
        accountId: String(editing.investmentAccountId),
        direction: editing.direction,
        amount: formatNumberToBrlInput(editing.amount),
        date: editing.date,
        description: editing.description ?? '',
      });
      return;
    }
    const preset = this.preset();
    this.form.reset({
      accountId: preset.accountId != null ? String(preset.accountId) : NO_ACCOUNT,
      direction: preset.direction,
      amount: '',
      date: defaultDateForMonth(this.monthCtx.selectedMonth()),
      description: '',
    });
  }
}
