import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { AuthTokenService } from '../../core/services/auth-token.service';
import {
  FinanceSummaryApiService,
  FinanceSummaryDto,
} from '../../core/services/finance-summary-api.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { UserProfileService } from '../../core/services/user-profile.service';

@Component({
  selector: 'app-emergency-fund',
  imports: [CurrencyPipe, DecimalPipe, LucideAngularModule],
  templateUrl: './emergency-fund.component.html',
  styleUrl: './emergency-fund.component.scss',
})
export class EmergencyFundComponent {
  private readonly summaryApi = inject(FinanceSummaryApiService);
  private readonly monthCtx = inject(MonthContextService);
  private readonly tokens = inject(AuthTokenService);
  private readonly userProfile = inject(UserProfileService);
  private readonly destroyRef = inject(DestroyRef);

  readonly summary = signal<FinanceSummaryDto | null>(null);
  readonly loadFailed = signal(false);

  readonly resolvedTargetMonths = computed(() => {
    const s = this.summary();
    const fromApi = s?.emergencyFundTargetMonths;
    if (typeof fromApi === 'number' && Number.isFinite(fromApi) && fromApi > 0) {
      return Math.min(120, Math.max(1, Math.round(fromApi)));
    }
    return this.userProfile.emergencyFundTargetMonths();
  });

  readonly reserveMonthsVsReference = computed((): number | null => {
    const s = this.summary();
    if (!s) return null;
    const exp = Number(s.monthExpenseTotal);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    const reserve = Number(s.totalEmergencyReserve);
    if (!Number.isFinite(reserve)) return null;
    const q = reserve / exp;
    if (!Number.isFinite(q)) return null;
    return Math.round(q * 100) / 100;
  });

  readonly progressPct = computed(() => {
    const covered = this.reserveMonthsVsReference();
    const target = this.resolvedTargetMonths();
    if (covered == null || target <= 0) return 0;
    return Math.min(100, Math.max(0, (covered / target) * 100));
  });

  constructor() {
    combineLatest([toObservable(this.monthCtx.selectedMonth), toObservable(this.tokens.hasToken)])
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a[0].year === b[0].year && a[0].month === b[0].month && a[1] === b[1]
        ),
        tap(([, has]) => {
          if (!has) {
            this.summary.set(null);
            this.loadFailed.set(false);
          }
        }),
        filter(([, has]) => has),
        map(([ym]) => ym),
        tap(() => this.loadFailed.set(false)),
        switchMap((ym) =>
          this.summaryApi.get(ym.year, ym.month).pipe(
            catchError(() => {
              this.loadFailed.set(true);
              return of(null as FinanceSummaryDto | null);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((s) => {
        this.summary.set(s);
        if (
          s &&
          typeof s.emergencyFundTargetMonths === 'number' &&
          Number.isFinite(s.emergencyFundTargetMonths)
        ) {
          this.userProfile.patchEmergencyMonthsLocal(s.emergencyFundTargetMonths);
        }
      });
  }
}
