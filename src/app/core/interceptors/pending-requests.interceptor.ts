import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { PendingRequestsService } from '../services/pending-requests.service';

export const pendingRequestsInterceptor: HttpInterceptorFn = (req, next) => {
  const pending = inject(PendingRequestsService);
  pending.begin();
  return next(req).pipe(finalize(() => pending.end()));
};
