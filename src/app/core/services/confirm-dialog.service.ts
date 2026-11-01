import { Injectable, computed, signal } from '@angular/core';

export interface ConfirmRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  readonly resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly pending = signal<PendingConfirm | null>(null);

  readonly current = computed((): ConfirmRequest | null => this.pending());

  ask(request: ConfirmRequest): Promise<boolean> {
    this.settle(false);
    return new Promise((resolve) => this.pending.set({ ...request, resolve }));
  }

  settle(confirmed: boolean): void {
    const pending = this.pending();
    if (!pending) return;
    this.pending.set(null);
    pending.resolve(confirmed);
  }
}
