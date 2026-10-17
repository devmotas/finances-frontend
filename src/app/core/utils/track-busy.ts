import { WritableSignal } from '@angular/core';
import { defer, finalize, MonoTypeOperatorFunction } from 'rxjs';

export function trackBusy<T>(busy: WritableSignal<boolean>): MonoTypeOperatorFunction<T> {
  return (source) =>
    defer(() => {
      busy.set(true);
      return source.pipe(finalize(() => busy.set(false)));
    });
}
