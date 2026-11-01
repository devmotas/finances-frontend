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
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
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
import { AccountModalComponent } from '../investments/account-modal/account-modal.component';
import { accountMonthNet } from '../investments/account-metrics';
import { directionBadgeLabel, directionItemLabel } from '../investments/account-role';
import { BalanceUpdateModalComponent } from '../investments/balance-update-modal/balance-update-modal.component';
import { MovementDeletion } from '../investments/movement-deletion';
import { MovementModalComponent, MovementPreset } from '../investments/movement-modal/movement-modal.component';

const FEEDBACK = {
  walletDeleted: 'Carteira excluída.',
  walletDeleteFailed: 'Não foi possível excluir a carteira.',
} as const;

const DEFAULT_PRESET: MovementPreset = { accountId: null, direction: MOVEMENT_DIRECTION.contribution };

export interface WalletCard {
  account: InvestmentMonthWallet;
  monthNet: number;
}

@Component({
  selector: 'app-wallet',
  imports: [
    CurrencyPipe,
    LucideAngularModule,
    MonthLoadErrorComponent,
    MonthLoadingComponent,
    SeriesDeleteModalComponent,
    AccountModalComponent,
    MovementModalComponent,
    BalanceUpdateModalComponent,
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent {
  private readonly facade = inject(FinancesFacadeService);
  private readonly toast = inject(ToastService);
  private readonly investmentApi = inject(InvestmentApiService);
  private readonly accountsApi = inject(InvestmentAccountsApiService);
  private readonly confirmDialog = inject(ConfirmDialogService);

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

  readonly directions = MOVEMENT_DIRECTION;
  readonly formatDate = formatIsoDate;

  readonly wallets = computed(() => this.view()?.wallets ?? []);
  readonly hasWallet = computed(() => this.wallets().length > 0);
  readonly movements = computed(() => this.view()?.walletTransactions ?? []);

  readonly walletCards = computed((): WalletCard[] =>
    this.wallets().map((account) => ({ account, monthNet: accountMonthNet(account) }))
  );

  accountName(movement: InvestmentMovement): string {
    return this.findWallet(movement.investmentAccountId)?.name ?? '';
  }

  badgeLabel(movement: InvestmentMovement): string {
    return directionBadgeLabel(this.findWallet(movement.investmentAccountId)?.role, movement.direction);
  }

  movementActionLabel(action: string, movement: InvestmentMovement): string {
    return `${action} ${this.describeMovement(movement)}`;
  }

  openNewWallet(): void {
    this.editingAccount.set(null);
    this.accountModalOpen.set(true);
  }

  openEditWallet(wallet: InvestmentMonthWallet): void {
    this.editingAccount.set(wallet);
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

  async deleteWallet(wallet: InvestmentMonthWallet): Promise<void> {
    if (this.deletingAccountId() !== null) return;
    const confirmed = await this.confirmDialog.ask({
      title: 'Excluir carteira',
      message: `Excluir a carteira "${wallet.name}"?`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!confirmed) return;
    this.deletingAccountId.set(wallet.id);
    this.accountsApi
      .delete(wallet.id)
      .pipe(finalize(() => this.deletingAccountId.set(null)))
      .subscribe({
        next: () => {
          this.toast.show(FEEDBACK.walletDeleted, 'success');
          this.refresh();
        },
        error: (err: unknown) =>
          this.toast.show(httpErrorMessage(err, FEEDBACK.walletDeleteFailed), 'error'),
      });
  }

  openTransfer(wallet: InvestmentMonthWallet, direction: MovementDirection): void {
    this.editingMovement.set(null);
    this.movementPreset.set({ accountId: wallet.id, direction });
    this.movementModalOpen.set(true);
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

  openBalanceUpdate(wallet: InvestmentMonthWallet): void {
    this.balanceAccount.set(wallet);
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

  private findWallet(id: number): InvestmentMonthWallet | undefined {
    return this.wallets().find((wallet) => wallet.id === id);
  }

  private describeMovement(movement: InvestmentMovement): string {
    const role = this.findWallet(movement.investmentAccountId)?.role;
    const kind = directionItemLabel(role, movement.direction);
    const name = movement.description?.trim() || this.accountName(movement);
    const amount = formatBrl(movement.amount);
    return name ? `${kind} “${name}” de ${amount}` : `${kind} de ${amount}`;
  }
}
