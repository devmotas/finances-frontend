import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { MonthContextService } from '../../core/services/month-context.service';
import { ToastService } from '../../core/services/toast.service';

export interface ShellNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly exact?: boolean;
  readonly iconModifier?: 'in' | 'out';
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly monthCtx = inject(MonthContextService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

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
  ];

  readonly mobileNavOpen = signal(false);

  readonly monthLabel = computed(() => {
    this.monthCtx.selectedMonth();
    return this.monthCtx.labelPtBr();
  });

  constructor() {
    effect(() => {
      this.document.body.style.overflow = this.mobileNavOpen() ? 'hidden' : '';
    });
    this.destroyRef.onDestroy(() => {
      this.document.body.style.overflow = '';
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
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  logout(): void {
    this.closeMobileNav();
    this.auth.logout();
    this.toast.show('Você saiu da conta.', 'info');
    this.router.navigateByUrl('/login');
  }
}
