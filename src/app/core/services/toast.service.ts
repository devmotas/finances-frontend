import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly items = signal<ToastMessage[]>([]);

  readonly toasts = this.items.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = 3200): void {
    const id = ++this.seq;
    this.items.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }
}
