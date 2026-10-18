import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EmergencyReserveApiService } from '../../core/services/emergency-reserve-api.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { monthScopedResource } from '../../shared/components/investments/month-scoped-resource';
import { MonthLoadErrorComponent } from '../../shared/components/month-load-error/month-load-error.component';
import { MonthLoadingComponent } from '../../shared/components/month-loading/month-loading.component';
import { coverageProgress, reserveAccountsAmount, shortTermIsBelowTarget } from './reserve-progress';

const INVESTMENTS_ROUTE = '/app/investimentos';
const REFERENCE_WINDOW_MONTHS = 6;

@Component({
  selector: 'app-emergency-fund',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    LucideAngularModule,
    RouterLink,
    MonthLoadErrorComponent,
    MonthLoadingComponent,
  ],
  templateUrl: './emergency-fund.component.html',
  styleUrl: './emergency-fund.component.scss',
})
export class EmergencyFundComponent {
  private readonly reserveApi = inject(EmergencyReserveApiService);
  private readonly userProfile = inject(UserProfileService);

  readonly investmentsRoute = INVESTMENTS_ROUTE;
  readonly referenceWindowMonths = REFERENCE_WINDOW_MONTHS;
  readonly resource = monthScopedResource((ym) => this.reserveApi.get(ym.year, ym.month));
  readonly reserve = this.resource.value;

  readonly progress = computed(() => {
    const reserve = this.reserve();
    return reserve ? coverageProgress(reserve) : null;
  });

  readonly reserveAccounts = computed(() => {
    const reserve = this.reserve();
    return reserve ? reserveAccountsAmount(reserve) : null;
  });

  readonly shortTermBelowTarget = computed(() => {
    const reserve = this.reserve();
    return reserve ? shortTermIsBelowTarget(reserve) : false;
  });

  constructor() {
    effect(() => {
      const reserve = this.reserve();
      if (reserve) this.userProfile.patchEmergencyMonthsLocal(reserve.targetMonths);
    });
  }
}
