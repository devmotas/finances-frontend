import { Injectable, signal } from '@angular/core';
import { finalize, Observable } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  readonly label: string;
  readonly busyLabel: string;
  readonly run: () => Observable<unknown>;
}

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
  actionBusy: boolean;
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

export const TOAST_ACTION_DURATION_MS = 8000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly items = signal<ToastMessage[]>([]);
  private readonly timers = new Map<number, ToastTimer>();

  readonly toasts = this.items.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = TOAST_DURATION_MS[kind]): void {
    this.add({ message, kind }, durationMs);
  }

  showWithAction(message: string, kind: ToastKind, action: ToastAction): void {
    this.add({ message, kind, action }, TOAST_ACTION_DURATION_MS);
  }

  runAction(id: number): void {
    const action = this.find(id)?.action;
    if (!action || this.isActionBusy(id)) return;
    this.pause(id);
    this.markActionBusy(id);
    action
      .run()
      .pipe(finalize(() => this.dismiss(id)))
      .subscribe();
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
    if (!timer || timer.handle !== null || this.isActionBusy(id)) return;
    this.startTimer(id, timer.remainingMs);
  }

  dismiss(id: number): void {
    const handle = this.timers.get(id)?.handle;
    if (handle) clearTimeout(handle);
    this.timers.delete(id);
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  private add(toast: Omit<ToastMessage, 'id' | 'actionBusy'>, durationMs: number): void {
    const id = ++this.seq;
    this.items.update((list) => [...list, { ...toast, id, actionBusy: false }]);
    this.startTimer(id, durationMs);
  }

  private find(id: number): ToastMessage | undefined {
    return this.items().find((t) => t.id === id);
  }

  private isActionBusy(id: number): boolean {
    return this.find(id)?.actionBusy === true;
  }

  private markActionBusy(id: number): void {
    this.items.update((list) => list.map((t) => (t.id === id ? { ...t, actionBusy: true } : t)));
  }

  private startTimer(id: number, durationMs: number): void {
    const handle = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, { handle, remainingMs: durationMs, startedAt: Date.now() });
  }
}
