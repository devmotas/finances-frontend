import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ToastKind, ToastService } from '../../../core/services/toast.service';
import { BusyButtonComponent } from '../busy-button/busy-button.component';

const ASSERTIVE_KIND: ToastKind = 'error';

@Component({
  selector: 'app-toast-container',
  imports: [NgTemplateOutlet, BusyButtonComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  private readonly toast = inject(ToastService);

  readonly politeToasts = computed(() => this.toast.toasts().filter((t) => t.kind !== ASSERTIVE_KIND));
  readonly errorToasts = computed(() => this.toast.toasts().filter((t) => t.kind === ASSERTIVE_KIND));

  pause(id: number): void {
    this.toast.pause(id);
  }

  resume(id: number): void {
    this.toast.resume(id);
  }

  runAction(id: number): void {
    this.toast.runAction(id);
  }

  dismiss(id: number): void {
    this.toast.dismiss(id);
  }
}
