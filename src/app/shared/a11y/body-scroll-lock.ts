import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, effect, inject } from '@angular/core';

const LOCKED_OVERFLOW = 'hidden';
const RESTORED_OVERFLOW = '';

@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private readonly document = inject(DOCUMENT);
  private holders = 0;

  lock(): void {
    this.holders++;
    this.document.body.style.overflow = LOCKED_OVERFLOW;
  }

  unlock(): void {
    if (this.holders === 0) return;
    this.holders--;
    if (this.holders === 0) this.document.body.style.overflow = RESTORED_OVERFLOW;
  }
}

export function lockBodyScrollWhile(active: Signal<boolean>): void {
  const scrollLock = inject(BodyScrollLockService);
  let locked = false;

  const sync = (shouldLock: boolean): void => {
    if (shouldLock === locked) return;
    locked = shouldLock;
    if (shouldLock) scrollLock.lock();
    else scrollLock.unlock();
  };

  effect(() => sync(active()));
  inject(DestroyRef).onDestroy(() => sync(false));
}
