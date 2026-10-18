import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';
import {
  InvestmentAccountRecord,
  InvestmentMonthAccount,
  InvestmentMonthWallet,
  InvestmentMovement,
  MOVEMENT_DIRECTION,
  MovementDirection,
} from '../../core/models/investment-accounts.models';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { InvestmentAccountsApiService } from '../../core/services/investment-accounts-api.service';
import { InvestmentApiService } from '../../core/services/investment-api.service';
import { InvestmentMovementsApiService } from '../../core/services/investment-movements-api.service';
import { ToastService } from '../../core/services/toast.service';
import { formatBrl } from '../../core/utils/brl-format';
import { httpErrorMessage } from '../../core/utils/http-error.util';
import { formatIsoDate } from '../../shared/components/investments/investment-form';
import { monthScopedResource } from '../../shared/components/investments/month-scoped-resource';
import { MonthLoadErrorComponent } from '../../shared/components/month-load-error/month-load-error.component';
import { MonthLoadingComponent } from '../../shared/components/month-loading/month-loading.component';
import { SeriesDeleteModalComponent } from '../../shared/components/series-delete-modal/series-delete-modal.component';
import { AccountModalComponent } from './account-modal/account-modal.component';
import { accountMonthNet, hasMissingToTarget } from './account-metrics';
import {
  ACCOUNT_ROLE_LABEL,
  directionActionLabel,
  directionBadgeLabel,
  directionItemLabel,
  isShortTermReserve,
} from './account-role';
import { BalanceUpdateModalComponent } from './balance-update-modal/balance-update-modal.component';
import { EvolutionChartComponent } from './evolution-chart/evolution-chart.component';
import { MovementDeletion } from './movement-deletion';
import { MovementModalComponent, MovementPreset } from './movement-modal/movement-modal.component';

const FEEDBACK = {
  accountDeleted: 'Conta excluída.',
  accountDeleteFailed: 'Não foi possível excluir a conta.',
  accountRequired: 'Crie uma conta antes de registrar um aporte ou resgate.',
} as const;

const DEFAULT_PRESET: MovementPreset = { accountId: null, direction: MOVEMENT_DIRECTION.contribution };

export interface AccountCard {
  account: InvestmentMonthAccount;
  roleLabel: string;
  isShortTerm: boolean;
  monthNet: number;
  monthYield: number | null;
  hasMissing: boolean;
}

export interface WalletCard {
  account: InvestmentMonthWallet;
  monthNet: number;
}

@Component({
  selector: 'app-investments',
  imports: [
    CurrencyPipe,
    LucideAngularModule,
    MonthLoadErrorComponent,
    MonthLoadingComponent,
    SeriesDeleteModalComponent,
    AccountModalComponent,
    MovementModalComponent,
    BalanceUpdateModalComponent,
    EvolutionChartComponent,
  ],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
})
export class InvestmentsComponent {
  private readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  private readonly investmentApi = inject(InvestmentApiService);
  private readonly accountsApi = inject(InvestmentAccountsApiService);

  readonly monthView = monthScopedResource((ym) => this.investmentApi.getMonthView(ym.year, ym.month));
  readonly view = this.monthView.value;

  readonly deletion = new MovementDeletion(inject(InvestmentMovementsApiService), this.toast, {
    describe: (movement) => this.describeMovement(movement),
    changed: () => this.refresh(),
  });

  readonly accountModalOpen = signal(false);
  readonly editingAccount = signal<InvestmentAccountRecord | null>(null);
  readonly movementModalOpen = signal(false);
  readonly editingMovement = signal<InvestmentMovement | null>(null);
  readonly movementPreset = signal<MovementPreset>(DEFAULT_PRESET);
  readonly balanceAccount = signal<InvestmentMonthAccount | null>(null);
  readonly deletingAccountId = signal<number | null>(null);
  readonly filterAccountId = signal<number | null>(null);

  readonly directions = MOVEMENT_DIRECTION;
  readonly formatDate = formatIsoDate;

  readonly accounts = computed(() => this.view()?.accounts ?? []);
  readonly wallets = computed(() => this.view()?.wallets ?? []);
  readonly movementAccounts = computed(() => [...this.accounts(), ...this.wallets()]);
  readonly hasAccounts = computed(() => this.movementAccounts().length > 0);
  readonly walletMovements = computed(() => this.view()?.walletTransactions ?? []);

  readonly walletCards = computed((): WalletCard[] =>
    this.wallets().map((account) => ({ account, monthNet: accountMonthNet(account) }))
  );

  readonly accountCards = computed((): AccountCard[] => {
    const view = this.view();
    if (!view) return [];
    return view.accounts.map((account) => ({
      account,
      roleLabel: ACCOUNT_ROLE_LABEL[account.role],
      isShortTerm: isShortTermReserve(account.role),
      monthNet: accountMonthNet(account),
      monthYield: account.monthYield,
      hasMissing: hasMissingToTarget(account),
    }));
  });

  readonly summary = computed(() => this.view()?.summary ?? null);
  readonly monthYield = computed(() => this.summary()?.monthYield ?? null);

  readonly movements = computed(() => {
    const all = this.view()?.transactions ?? [];
    const accountId = this.filterAccountId();
    return accountId === null ? all : all.filter((m) => m.investmentAccountId === accountId);
  });

  accountName(movement: InvestmentMovement): string {
    return this.findAccount(movement.investmentAccountId)?.name ?? '';
  }

  badgeLabel(movement: InvestmentMovement): string {
    return directionBadgeLabel(this.findAccount(movement.investmentAccountId)?.role, movement.direction);
  }

  actionLabel(card: AccountCard, direction: MovementDirection): string {
    return directionActionLabel(card.account.role, direction);
  }

  movementActionLabel(action: string, movement: InvestmentMovement): string {
    return `${action} ${this.describeMovement(movement)}`;
  }

  selectAllAccounts(): void {
    this.filterAccountId.set(null);
  }

  toggleAccountFilter(id: number): void {
    this.filterAccountId.update((current) => (current === id ? null : id));
  }

  openNewAccount(): void {
    this.editingAccount.set(null);
    this.accountModalOpen.set(true);
  }

  openEditAccount(account: InvestmentMonthAccount): void {
    this.editingAccount.set(account);
    this.accountModalOpen.set(true);
  }

  closeAccountModal(): void {
    this.accountModalOpen.set(false);
    this.editingAccount.set(null);
  }

  onAccountSaved(): void {
    this.closeAccountModal();
    this.refresh();
  }

  deleteAccount(account: InvestmentMonthAccount): void {
    if (this.deletingAccountId() !== null) return;
    if (!confirm(`Excluir a conta "${account.name}"?`)) return;
    this.deletingAccountId.set(account.id);
    this.accountsApi
      .delete(account.id)
      .pipe(finalize(() => this.deletingAccountId.set(null)))
      .subscribe({
        next: () => {
          this.toast.show(FEEDBACK.accountDeleted, 'success');
          this.refresh();
        },
        error: (err: unknown) =>
          this.toast.show(httpErrorMessage(err, FEEDBACK.accountDeleteFailed), 'error'),
      });
  }

  openNewMovement(
    accountId: number | null = null,
    direction: MovementDirection = MOVEMENT_DIRECTION.contribution
  ): void {
    if (!this.view()) return;
    if (!this.hasAccounts()) {
      this.toast.show(FEEDBACK.accountRequired, 'info');
      this.openNewAccount();
      return;
    }
    this.editingMovement.set(null);
    this.movementPreset.set({ accountId, direction });
    this.movementModalOpen.set(true);
  }

  openTransfer(wallet: InvestmentMonthWallet): void {
    this.openNewMovement(wallet.id, MOVEMENT_DIRECTION.contribution);
  }

  openEditMovement(movement: InvestmentMovement): void {
    this.editingMovement.set(movement);
    this.movementModalOpen.set(true);
  }

  closeMovementModal(): void {
    this.movementModalOpen.set(false);
    this.editingMovement.set(null);
  }

  onMovementSaved(): void {
    this.closeMovementModal();
    this.refresh();
  }

  openBalanceUpdate(account: InvestmentMonthAccount): void {
    this.balanceAccount.set(account);
  }

  closeBalanceUpdate(): void {
    this.balanceAccount.set(null);
  }

  onBalanceUpdated(): void {
    this.closeBalanceUpdate();
    this.refresh();
  }

  private refresh(): void {
    this.monthView.reload();
    this.facade.reloadCurrentMonth();
  }

  private findAccount(id: number): InvestmentMonthAccount | undefined {
    return this.movementAccounts().find((account) => account.id === id);
  }

  private describeMovement(movement: InvestmentMovement): string {
    const role = this.findAccount(movement.investmentAccountId)?.role;
    const kind = directionItemLabel(role, movement.direction);
    const name = movement.description?.trim() || this.accountName(movement);
    const amount = formatBrl(movement.amount);
    return name ? `${kind} “${name}” de ${amount}` : `${kind} de ${amount}`;
  }
}
