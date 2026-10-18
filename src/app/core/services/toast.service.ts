import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastTimer {
  handle: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
}

export const TOAST_DURATION_MS: Record<ToastKind, number> = {
  success: 3200,
  info: 3200,
  error: 8000,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly items = signal<ToastMessage[]>([]);
  private readonly timers = new Map<number, ToastTimer>();

  readonly toasts = this.items.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = TOAST_DURATION_MS[kind]): void {
    const id = ++this.seq;
    this.items.update((list) => [...list, { id, message, kind }]);
    this.startTimer(id, durationMs);
  }

  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle === null) return;
    clearTimeout(timer.handle);
    timer.handle = null;
    timer.remainingMs -= Date.now() - timer.startedAt;
  }

  resume(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle !== null) return;
    this.startTimer(id, timer.remainingMs);
  }

  dismiss(id: number): void {
    const handle = this.timers.get(id)?.handle;
    if (handle) clearTimeout(handle);
    this.timers.delete(id);
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  private startTimer(id: number, durationMs: number): void {
    const handle = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, { handle, remainingMs: durationMs, startedAt: Date.now() });
  }
}
