import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MonthContextService } from '../../core/services/month-context.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly monthCtx = inject(MonthContextService);

  readonly monthLabel = computed(() => {
    this.monthCtx.selectedMonth();
    return this.monthCtx.labelPtBr();
  });

  prev(): void {
    this.monthCtx.prevMonth();
  }

  next(): void {
    this.monthCtx.nextMonth();
  }
}
