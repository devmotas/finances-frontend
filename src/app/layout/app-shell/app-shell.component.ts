import { CdkTrapFocus } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
  Signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { FinancesFacadeService } from '../../core/services/finances-facade.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { PendingRequestsService } from '../../core/services/pending-requests.service';
import { ToastService } from '../../core/services/toast.service';
import { lockBodyScrollWhile } from '../../shared/a11y/body-scroll-lock';

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';
const INERT_ON = '';

export interface ShellNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly exact?: boolean;
  readonly iconModifier?: 'in' | 'out';
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, CdkTrapFocus],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly _financesBootstrap = inject(FinancesFacadeService);

  private readonly monthCtx = inject(MonthContextService);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly pendingRequests = inject(PendingRequestsService);

  readonly navItems: readonly ShellNavItem[] = [
    {
      path: '/app/visao-geral',
      label: 'Visão Geral',
      icon: 'layout-dashboard',
      exact: true,
    },
    {
      path: '/app/entradas',
      label: 'Entradas',
      icon: 'arrow-down-left',
      iconModifier: 'in',
    },
    {
      path: '/app/saidas',
      label: 'Saídas',
      icon: 'arrow-up-right',
      iconModifier: 'out',
    },
    {
      path: '/app/investimentos',
      label: 'Investimentos',
      icon: 'landmark',
    },
    {
      path: '/app/reserva-emergencia',
      label: 'Reserva',
      icon: 'piggy-bank',
    },
    {
      path: '/app/configuracoes',
      label: 'Configurações',
      icon: 'settings',
    },
  ];

  readonly mobileNavOpen = signal(false);
  readonly inertWhileNavOpen = computed(() => (this.mobileNavOpen() ? INERT_ON : null));

  private readonly navToggle = viewChild.required<ElementRef<HTMLButtonElement>>('navToggle');
  private readonly drawerClose = viewChild.required<ElementRef<HTMLButtonElement>>('drawerClose');

  readonly monthLabel = computed(() => {
    this.monthCtx.selectedMonth();
    return this.monthCtx.labelPtBr();
  });

  constructor() {
    lockBodyScrollWhile(this.mobileNavOpen);
    inject(BreakpointObserver)
      .observe(DESKTOP_MEDIA_QUERY)
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        if (matches) this.mobileNavOpen.set(false);
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileNavOpen()) {
      this.closeMobileNav();
    }
  }

  prev(): void {
    this.monthCtx.prevMonth();
  }

  next(): void {
    this.monthCtx.nextMonth();
  }

  toggleMobileNav(): void {
    if (this.mobileNavOpen()) this.closeMobileNav();
    else this.openMobileNav();
  }

  closeMobileNav(): void {
    if (!this.mobileNavOpen()) return;
    this.mobileNavOpen.set(false);
    this.focusAfterRender(this.navToggle);
  }

  private openMobileNav(): void {
    this.mobileNavOpen.set(true);
    this.focusAfterRender(this.drawerClose);
  }

  private focusAfterRender(target: Signal<ElementRef<HTMLElement>>): void {
    afterNextRender(() => target().nativeElement.focus(), { injector: this.injector });
  }

  logout(): void {
    if (!confirm('Deseja realmente sair da conta?')) {
      return;
    }
    this.closeMobileNav();
    this.auth.logout();
    this.toast.show('Você saiu da conta.', 'info');
    this.router.navigateByUrl('/login');
  }
}
