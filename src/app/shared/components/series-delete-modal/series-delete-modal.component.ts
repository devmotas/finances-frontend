import { Component, ElementRef, HostListener, computed, effect, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BusyButtonComponent } from '../busy-button/busy-button.component';
import { BUSY_LABEL } from '../busy-button/busy-labels';
import { SERIES_DELETE_SCOPE, SeriesDeleteScope } from './series-delete-scope';

const ESCAPE_KEY = 'Escape';
const BACKDROP_CLASS = 'modal__backdrop';
const AUTOFOCUS_SELECTOR = '[data-autofocus]';

@Component({
  selector: 'app-series-delete-modal',
  imports: [LucideAngularModule, BusyButtonComponent],
  templateUrl: './series-delete-modal.component.html',
  styleUrl: './series-delete-modal.component.scss',
})
export class SeriesDeleteModalComponent {
  private readonly el = inject(ElementRef);

  readonly visible = input(false);
  readonly isSeries = input(false);
  readonly itemLabel = input.required<string>();
  readonly deletingScope = input<SeriesDeleteScope | null>(null);

  readonly scope = SERIES_DELETE_SCOPE;
  readonly deletingLabel = BUSY_LABEL.deleting;
  readonly isDeleting = computed(() => this.deletingScope() !== null);

  readonly confirmed = output<SeriesDeleteScope>();
  readonly cancelled = output<void>();

  constructor() {
    effect(() => {
      if (this.visible()) setTimeout(() => this.focusSafestAction());
    });
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

  private focusSafestAction(): void {
    (this.el.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>(AUTOFOCUS_SELECTOR)
      ?.focus();
  }
}
