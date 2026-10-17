import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PendingRequestsService {
  private readonly openRequests = signal(0);

  readonly count = this.openRequests.asReadonly();
  readonly hasPending = computed(() => this.openRequests() > 0);

  begin(): void {
    this.openRequests.update((n) => n + 1);
  }

  end(): void {
    this.openRequests.update((n) => Math.max(0, n - 1));
  }
}
