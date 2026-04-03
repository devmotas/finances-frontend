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
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MonthContextService } from '../../core/services/month-context.service';

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

  readonly navItems: readonly ShellNavItem[] = [
    {
      path: '/visao-geral',
      label: 'Visão Geral',
      icon: 'layout-dashboard',
      exact: true,
    },
    {
      path: '/entradas',
      label: 'Entradas',
      icon: 'arrow-down-left',
      iconModifier: 'in',
    },
    {
      path: '/saidas',
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
}
