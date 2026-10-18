import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, HostListener, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BusyButtonComponent } from '../busy-button/busy-button.component';
import { BUSY_LABEL } from '../busy-button/busy-labels';
import { lockBodyScrollWhile } from '../../a11y/body-scroll-lock';
import { SERIES_KIND, SeriesKind } from '../../../core/models/finances.models';
import { SERIES_DELETE_SCOPE, SeriesDeleteScope } from './series-delete-scope';

const ESCAPE_KEY = 'Escape';
const BACKDROP_CLASS = 'modal__backdrop';

interface SeriesDeleteCopy {
  readonly detail: string;
  readonly futureHint: string;
}

const SERIES_DELETE_COPY: Record<SeriesKind, SeriesDeleteCopy> = {
  fixed: {
    detail: 'Ele faz parte de uma série fixa. Escolha até onde excluir.',
    futureHint: 'Encerra a série: este mês e os seguintes deixam de existir.',
  },
  installment: {
    detail: 'Ele é uma parcela de uma compra parcelada. Escolha até onde excluir.',
    futureHint: 'Apaga esta parcela e todas as seguintes.',
  },
};

@Component({
  selector: 'app-series-delete-modal',
  imports: [LucideAngularModule, BusyButtonComponent, CdkTrapFocus],
  templateUrl: './series-delete-modal.component.html',
  styleUrl: './series-delete-modal.component.scss',
})
export class SeriesDeleteModalComponent {
  readonly visible = input(false);
  readonly isSeries = input(false);
  readonly seriesKind = input<SeriesKind>(SERIES_KIND.fixed);
  readonly itemLabel = input.required<string>();
  readonly deletingScope = input<SeriesDeleteScope | null>(null);

  readonly scope = SERIES_DELETE_SCOPE;
  readonly deletingLabel = BUSY_LABEL.deleting;
  readonly isDeleting = computed(() => this.deletingScope() !== null);
  readonly copy = computed(() => SERIES_DELETE_COPY[this.seriesKind()]);

  readonly confirmed = output<SeriesDeleteScope>();
  readonly cancelled = output<void>();

  constructor() {
    lockBodyScrollWhile(this.visible);
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === ESCAPE_KEY && this.visible()) this.cancel();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains(BACKDROP_CLASS)) this.cancel();
  }

  isDeletingScope(scope: SeriesDeleteScope): boolean {
    return this.deletingScope() === scope;
  }

  cancel(): void {
    if (this.isDeleting()) return;
    this.cancelled.emit();
  }

  deleteThisMonth(): void {
    this.confirmed.emit(SERIES_DELETE_SCOPE.thisMonth);
  }

  deleteThisAndFuture(): void {
    this.confirmed.emit(SERIES_DELETE_SCOPE.thisAndFuture);
  }
}
