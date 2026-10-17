import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FinancesFacadeService } from '../../../core/services/finances-facade.service';

const RETRY_LABEL = 'Tentar de novo';
const RETRYING_LABEL = 'Tentando…';

@Component({
  selector: 'app-month-load-error',
  imports: [LucideAngularModule],
  templateUrl: './month-load-error.component.html',
  styleUrl: './month-load-error.component.scss',
})
export class MonthLoadErrorComponent {
  readonly facade = inject(FinancesFacadeService);

  readonly retryLabel = computed(() => (this.facade.isLoading() ? RETRYING_LABEL : RETRY_LABEL));

  retry(): void {
    this.facade.reloadCurrentMonth();
  }
}
