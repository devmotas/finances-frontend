import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, computed, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { lockBodyScrollWhile } from '../../a11y/body-scroll-lock';

const BACKDROP_CLASS = 'modal__backdrop';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CdkTrapFocus],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  private readonly dialog = inject(ConfirmDialogService);

  readonly request = this.dialog.current;
  private readonly open = computed(() => this.request() !== null);

  constructor() {
    lockBodyScrollWhile(this.open);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    this.cancel();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains(BACKDROP_CLASS)) this.cancel();
  }

  cancel(): void {
    this.dialog.settle(false);
  }

  confirm(): void {
    this.dialog.settle(true);
  }
}
